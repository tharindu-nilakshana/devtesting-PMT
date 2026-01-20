import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ChevronDown, ChevronRight, X, Settings, Maximize2, Calendar as CalendarIcon, Save } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, parse } from "date-fns";
import {
  getAllScoringPeriods,
  getAllScoringPeriodsForWidget,
  getCurrentActivePeriod,
  createNewScoringPeriod,
  deleteScoringPeriod,
  loadTradeIdeas,
  saveTradeIdea,
  deleteTradeIdea,
  updateTradeIdeaOrder,
  type ScoringPeriod,
  type TradeIdea,
} from "./api";

interface ScoringTableProps {
  wgid?: string;
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, any>;
}

type BiasValue = 
  | "Very Bullish"
  | "Bullish" 
  | "Weak Bullish"
  | "Neutral"
  | "Weak Bearish"
  | "Bearish"
  | "Very Bearish"
  | "Uptrend"
  | "Downtrend"
  | "Range";

interface IndicatorCategory {
  name: string;
  indicators: string[];
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

const allCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD", "NZD", "JPY", "CHF"];

// Default Widget ID for Scoring Table
const DEFAULT_WIDGET_ID = 400;

const getBiasColor = (bias: BiasValue): string => {
  switch (bias) {
    case "Very Bullish":
      return "border-[#22c55e]/30 bg-[#22c55e]/8 text-[#22c55e]";
    case "Bullish":
      return "border-[#22c55e]/30 bg-[#22c55e]/8 text-[#22c55e]";
    case "Weak Bullish":
      return "border-[#22c55e]/30 bg-[#22c55e]/8 text-[#22c55e]";
    case "Neutral":
      return "border-border/30 bg-muted/20 text-muted-foreground";
    case "Bearish":
      return "border-[#ef4444]/30 bg-[#ef4444]/8 text-[#ef4444]";
    case "Very Bearish":
      return "border-[#ef4444]/30 bg-[#ef4444]/8 text-[#ef4444]";
    case "Weak Bearish":
      return "border-[#ef4444]/30 bg-[#ef4444]/8 text-[#ef4444]";
    case "Uptrend":
      return "border-[#22c55e]/30 bg-[#22c55e]/8 text-[#22c55e]";
    case "Downtrend":
      return "border-[#ef4444]/30 bg-[#ef4444]/8 text-[#ef4444]";
    case "Range":
      return "border-border/30 bg-muted/20 text-muted-foreground";
    default:
      return "border-border/30 bg-muted/20 text-muted-foreground";
  }
};

// Calculate overall bias based on scores
const calculateOverallBias = (scores: Record<string, BiasValue>): BiasValue => {
  const values = Object.values(scores);
  if (values.length === 0) return "Neutral";
  
  const scoreMap: Record<BiasValue, number> = {
    "Very Bullish": 2,
    "Bullish": 1.5,
    "Weak Bullish": 0.5,
    "Neutral": 0,
    "Weak Bearish": -0.5,
    "Bearish": -1.5,
    "Very Bearish": -2,
    "Uptrend": 1.5,
    "Downtrend": -1.5,
    "Range": 0,
  };
  
  const total = values.reduce((sum, bias) => sum + scoreMap[bias], 0);
  const average = total / values.length;
  
  if (average >= 1.5) return "Very Bullish";
  if (average >= 0.75) return "Bullish";
  if (average >= 0.25) return "Weak Bullish";
  if (average > -0.25) return "Neutral";
  if (average > -0.75) return "Weak Bearish";
  if (average > -1.5) return "Bearish";
  return "Very Bearish";
};

export default function ScoringTable({ onSettings, onRemove, settings }: ScoringTableProps) {
  const widgetID = settings?.widgetID || DEFAULT_WIDGET_ID;
  
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(allCurrencies);
  
  // Week management (periods from API)
  const [weeks, setWeeks] = useState<string[]>([]);
  const [periods, setPeriods] = useState<ScoringPeriod[]>([]);
  const [activeWeekIndex, setActiveWeekIndex] = useState(0);
  
  const [categories, setCategories] = useState<IndicatorCategory[]>([]);
  
  const [standaloneIndicators, setStandaloneIndicators] = useState<string[]>([]);
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Store scores for each currency and indicator
  const [scores, setScores] = useState<Record<string, Record<string, BiasValue>>>({});
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingIndicator, setIsAddingIndicator] = useState<string | null>(null);
  const [isAddingStandalone, setIsAddingStandalone] = useState(false);
  const [newIndicatorName, setNewIndicatorName] = useState("");
  
  // Date picker state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [editingWeekIndex, setEditingWeekIndex] = useState<number | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(new Date());
  
  // Map period dates to week string format
  const formatPeriodToWeek = (period: ScoringPeriod): string => {
    // Handle different date formats from API
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    if (period.startDate && period.endDate) {
      // Format: "12/01/2025"
      try {
        startDate = parse(period.startDate, "MM/dd/yyyy", new Date());
        endDate = parse(period.endDate, "MM/dd/yyyy", new Date());
      } catch {
        // Try alternative format
        try {
          startDate = parse(period.startDate, "yyyy-MM-dd", new Date());
          endDate = parse(period.endDate, "yyyy-MM-dd", new Date());
        } catch {
          return "";
        }
      }
    } else if (period.StartDate && period.EndDate) {
      // Format: "2024-01-01"
      try {
        startDate = parse(period.StartDate, "yyyy-MM-dd", new Date());
        endDate = parse(period.EndDate, "yyyy-MM-dd", new Date());
      } catch {
        return "";
      }
    }
    
    if (startDate && endDate) {
      return `${format(startDate, 'dd MMM')} - ${format(endDate, 'dd MMM')}`;
    }
    
    return "";
  };
  
  // Fetch periods from API
  const fetchPeriods = useCallback(async () => {
    try {
      setError(null);
      // Use GetAllScoringPeriodsForWidget which actually works
      const response = await getAllScoringPeriodsForWidget();
      if (response.success && response.periods) {
        setPeriods(response.periods);
        const weekStrings = response.periods.map(formatPeriodToWeek).filter(Boolean);
        setWeeks(weekStrings);
        if (weekStrings.length > 0 && activeWeekIndex >= weekStrings.length) {
          setActiveWeekIndex(0);
        }
      }
    } catch (err) {
      console.error("Failed to fetch periods:", err);
      setError(err instanceof Error ? err.message : "Failed to load periods");
    }
  }, [widgetID, activeWeekIndex]);
  
  // Fetch trade ideas from API
  const fetchTradeIdeas = useCallback(async () => {
    try {
      setError(null);
      const tradeIdeas = await loadTradeIdeas({ WidgetID: widgetID });
      console.log('Fetched trade ideas:', tradeIdeas);
      
      // Group trade ideas by category/indicator structure
      // For now, we'll treat each trade idea as a standalone indicator
      // The CurrencyData contains the scores for each currency
      const newStandaloneIndicators: string[] = [];
      const newScores: Record<string, Record<string, BiasValue>> = {};
      
      // Initialize scores for all currencies
      allCurrencies.forEach(currency => {
        newScores[currency] = {};
      });
      
      // Track which indicators we've seen to avoid duplicates
      const seenIndicators = new Set<string>();
      
      tradeIdeas.forEach((idea: TradeIdea) => {
        if (idea.Indicator && !seenIndicators.has(idea.Indicator)) {
          seenIndicators.add(idea.Indicator);
          newStandaloneIndicators.push(idea.Indicator);
          
          // Extract currency scores from CurrencyData
          if (idea.CurrencyData && typeof idea.CurrencyData === 'object') {
            allCurrencies.forEach(currency => {
              if (idea.CurrencyData && typeof idea.CurrencyData === 'object' && currency in idea.CurrencyData) {
                const biasValue = idea.CurrencyData[currency] as BiasValue;
                if (newScores[currency]) {
                  newScores[currency][idea.Indicator] = biasValue;
                }
              } else {
                // Default to Neutral if not set
                if (newScores[currency]) {
                  newScores[currency][idea.Indicator] = "Neutral";
                }
              }
            });
          } else {
            // Initialize with Neutral if no CurrencyData
            allCurrencies.forEach(currency => {
              if (newScores[currency]) {
                newScores[currency][idea.Indicator] = "Neutral";
              }
            });
          }
        }
      });
      
      console.log('Processed indicators:', newStandaloneIndicators);
      console.log('Processed scores:', newScores);
      
      // For now, all loaded indicators go to standalone
      // TODO: Restore category structure if we store it in the API
      setStandaloneIndicators(newStandaloneIndicators);
      setScores(newScores);
    } catch (err) {
      console.error("Failed to fetch trade ideas:", err);
      setError(err instanceof Error ? err.message : "Failed to load trade ideas");
    }
  }, [widgetID]);
  
  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchPeriods(), fetchTradeIdeas()]);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [fetchPeriods, fetchTradeIdeas]);

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const addCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory = { name: newCategoryName.trim(), indicators: [] };
      setCategories([...categories, newCategory]);
      setExpandedCategories(new Set([...expandedCategories, newCategoryName.trim()]));
      setNewCategoryName("");
      setIsAddingCategory(false);
      // Save will happen via useEffect
    }
  };

  const deleteCategory = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    if (category) {
      // Remove scores for all indicators in this category
      const updatedScores = { ...scores };
      allCurrencies.forEach(currency => {
        category.indicators.forEach(indicator => {
          delete updatedScores[currency][indicator];
        });
      });
      setScores(updatedScores);
    }
    
    setCategories(categories.filter(cat => cat.name !== categoryName));
    const newExpanded = new Set(expandedCategories);
    newExpanded.delete(categoryName);
    setExpandedCategories(newExpanded);
  };

  const addIndicator = (categoryName: string) => {
    if (newIndicatorName.trim()) {
      const indicatorName = newIndicatorName.trim();
      setCategories(categories.map(cat => {
        if (cat.name === categoryName) {
          return { ...cat, indicators: [...cat.indicators, indicatorName] };
        }
        return cat;
      }));
      
      // Initialize scores for all currencies for this new indicator
      const updatedScores = { ...scores };
      allCurrencies.forEach(currency => {
        if (!updatedScores[currency]) {
          updatedScores[currency] = {};
        }
        updatedScores[currency][indicatorName] = "Neutral";
      });
      setScores(updatedScores);
      
      setNewIndicatorName("");
      setIsAddingIndicator(null);
      // Save will happen via useEffect
    }
  };

  const addStandaloneIndicator = async () => {
    if (newIndicatorName.trim()) {
      const indicatorName = newIndicatorName.trim();
      
      // Initialize currency data with Neutral for all currencies
      const currencyData: Record<string, any> = {};
      allCurrencies.forEach(currency => {
        currencyData[currency] = "Neutral";
      });
      
      try {
        // Create trade idea via API
        const rowID = `row_${indicatorName}_${Date.now()}`;
        await saveTradeIdea({
          WidgetID: widgetID,
          RowID: rowID,
          Indicator: indicatorName,
          CurrencyData: currencyData,
        });
        
        // Update local state
        setStandaloneIndicators([...standaloneIndicators, indicatorName]);
        const updatedScores = { ...scores };
        allCurrencies.forEach(currency => {
          if (!updatedScores[currency]) {
            updatedScores[currency] = {};
          }
          updatedScores[currency][indicatorName] = "Neutral";
        });
        setScores(updatedScores);
        
        setNewIndicatorName("");
        setIsAddingStandalone(false);
      } catch (err) {
        console.error("Failed to add indicator:", err);
        setError(err instanceof Error ? err.message : "Failed to add indicator");
      }
    }
  };

  const deleteIndicator = async (categoryName: string | undefined, indicatorName: string) => {
    try {
      // Find and delete trade idea via API
      const tradeIdeas = await loadTradeIdeas({ WidgetID: widgetID });
      const ideaToDelete = tradeIdeas.find((idea: TradeIdea) => idea.Indicator === indicatorName);
      
      if (ideaToDelete?.RowID) {
        await deleteTradeIdea({
          WidgetID: widgetID,
          RowID: ideaToDelete.RowID,
        });
      }
      
      // Update local state
      if (categoryName) {
        setCategories(categories.map(cat => {
          if (cat.name === categoryName) {
            return { ...cat, indicators: cat.indicators.filter(ind => ind !== indicatorName) };
          }
          return cat;
        }));
      } else {
        setStandaloneIndicators(standaloneIndicators.filter(ind => ind !== indicatorName));
      }
      
      // Remove scores for this indicator
      const updatedScores = { ...scores };
      allCurrencies.forEach(currency => {
        if (updatedScores[currency]) {
          delete updatedScores[currency][indicatorName];
        }
      });
      setScores(updatedScores);
    } catch (err) {
      console.error("Failed to delete indicator:", err);
      setError(err instanceof Error ? err.message : "Failed to delete indicator");
    }
  };

  const updateScore = (currency: string, indicator: string, value: BiasValue) => {
    // Update local state immediately (will be saved when user clicks Save)
    setScores(prev => ({
      ...prev,
      [currency]: {
        ...prev[currency] || {},
        [indicator]: value,
      }
    }));
  };
  
  // Save all data to backend
  const saveAllData = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      // Get all indicators (from categories and standalone)
      const allIndicators: string[] = [];
      
      // Collect indicators from categories
      categories.forEach(category => {
        category.indicators.forEach(indicator => {
          if (!allIndicators.includes(indicator)) {
            allIndicators.push(indicator);
          }
        });
      });
      
      // Add standalone indicators
      standaloneIndicators.forEach(indicator => {
        if (!allIndicators.includes(indicator)) {
          allIndicators.push(indicator);
        }
      });
      
      console.log('Saving indicators:', allIndicators);
      console.log('Current scores:', scores);
      
      // Get existing trade ideas to preserve RowIDs and find ones to delete
      const existingTradeIdeas = await loadTradeIdeas({ WidgetID: widgetID });
      console.log('Existing trade ideas:', existingTradeIdeas);
      
      const existingIdeasMap = new Map<string, TradeIdea>();
      existingTradeIdeas.forEach((idea: TradeIdea) => {
        existingIdeasMap.set(idea.Indicator, idea);
      });
      
      // Delete trade ideas that are no longer in our indicators list
      const indicatorsToDelete = existingTradeIdeas
        .filter((idea: TradeIdea) => !allIndicators.includes(idea.Indicator))
        .map((idea: TradeIdea) => idea.RowID);
      
      const deletePromises = indicatorsToDelete.map(rowID =>
        deleteTradeIdea({ WidgetID: widgetID, RowID: rowID }).catch(err => {
          console.warn(`Failed to delete trade idea ${rowID}:`, err);
        })
      );
      
      // Save each indicator as a trade idea
      const savePromises = allIndicators.map(async (indicator) => {
        // Build currency data for this indicator
        const currencyData: Record<string, any> = {};
        allCurrencies.forEach(currency => {
          currencyData[currency] = scores[currency]?.[indicator] || "Neutral";
        });
        
        // Use existing RowID or create new one
        const existingIdea = existingIdeasMap.get(indicator);
        const rowID = existingIdea?.RowID || `row_${indicator}_${Date.now()}`;
        
        console.log(`Saving indicator "${indicator}" with RowID "${rowID}":`, currencyData);
        
        // CurrencyData might need to be a JSON string - try both formats
        const result = await saveTradeIdea({
          WidgetID: widgetID,
          RowID: rowID,
          Indicator: indicator,
          CurrencyData: currencyData, // Keep as object first, API might accept it
        });
        
        console.log(`Save result for "${indicator}":`, result);
        return result;
      });
      
      // Execute all saves and deletes in parallel
      await Promise.all([...savePromises, ...deletePromises]);
      
      // Wait longer for the backend to process and persist
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Refresh data to ensure consistency - retry a few times if empty
      let retries = 3;
      while (retries > 0) {
        await fetchTradeIdeas();
        
        // Check if we got data
        const currentTradeIdeas = await loadTradeIdeas({ WidgetID: widgetID });
        if (currentTradeIdeas.length > 0) {
          console.log('Successfully loaded trade ideas after save');
          break;
        }
        
        retries--;
        if (retries > 0) {
          console.log(`No data yet, retrying... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Failed to save data:", err);
      setError(err instanceof Error ? err.message : "Failed to save data");
    } finally {
      setIsSaving(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });

  const deleteWeek = async (index: number) => {
    if (weeks.length > 1) {
      const period = periods[index];
      if (period?.PeriodID) {
        try {
          await deleteScoringPeriod({ PeriodID: period.PeriodID });
          await fetchPeriods();
          if (activeWeekIndex >= weeks.length - 1) {
            setActiveWeekIndex(Math.max(0, weeks.length - 2));
          }
        } catch (err) {
          console.error("Failed to delete period:", err);
          setError(err instanceof Error ? err.message : "Failed to delete period");
        }
      }
    }
  };

  const openDatePicker = (index: number | null = null) => {
    setEditingWeekIndex(index);
    setIsDatePickerOpen(true);
    if (index !== null && index < weeks.length) {
      // Parse existing week date if editing
      const weekStr = weeks[index];
      const match = weekStr.match(/(\d+) (\w+) -/);
      if (match) {
        const day = parseInt(match[1]);
        const monthStr = match[2];
        const monthMap: Record<string, number> = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const month = monthMap[monthStr] || new Date().getMonth();
        const year = new Date().getFullYear();
        setSelectedStartDate(new Date(year, month, day));
      }
    } else {
      setSelectedStartDate(new Date());
    }
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (date && editingWeekIndex !== null) {
      const startDate = date;
      const endDate = addDays(date, 6);
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      const newWeek = `${format(startDate, 'dd MMM')} - ${format(endDate, 'dd MMM')}`;
      
      try {
        // If editingWeekIndex equals weeks.length, we're adding a new week
        if (editingWeekIndex === weeks.length) {
          // Create new period via API
          const response = await createNewScoringPeriod({
            WidgetID: widgetID,
            StartDate: startDateStr,
            EndDate: endDateStr,
          });
          
          if (response.success) {
            // Refresh periods
            await fetchPeriods();
            setActiveWeekIndex(weeks.length);
          }
        } else {
          // Editing existing period - for now we'll delete and recreate
          // (API doesn't seem to have an update endpoint)
          const period = periods[editingWeekIndex];
          if (period?.PeriodID) {
            await deleteScoringPeriod({ PeriodID: period.PeriodID });
            await createNewScoringPeriod({
              WidgetID: widgetID,
              StartDate: startDateStr,
              EndDate: endDateStr,
            });
            await fetchPeriods();
          }
        }
        
        setIsDatePickerOpen(false);
        setEditingWeekIndex(null);
      } catch (err) {
        console.error("Failed to save period:", err);
        setError(err instanceof Error ? err.message : "Failed to save period");
      }
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-widget-body border border-border">
        <div className="text-sm text-muted-foreground">Loading scoring table data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-widget-body border border-border">
        <div className="text-sm text-destructive mb-2">Error: {error}</div>
        <button
          onClick={() => {
            setLoading(true);
            fetchPeriods().then(() => fetchTradeIdeas()).finally(() => setLoading(false));
          }}
          className="text-xs text-primary hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-widget-body border border-border">
      {/* Custom Header */}
      <div className="h-8 px-3 border-b border-border flex items-center justify-between bg-widget-header group">
        <div className="flex items-center gap-3" onClick={onFullscreen ? onFullscreen : undefined}>
          <span className="text-xs">Scoring Table</span>
          {onFullscreen && (
            <div className="text-muted-foreground text-[10px] ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to expand
            </div>
          )}
          <div className="h-3 w-px bg-border"></div>
          
          {/* Week Tabs */}
          <div className="flex items-center gap-1">
            {weeks.map((week, index) => (
              <Popover key={index} open={isDatePickerOpen && editingWeekIndex === index} onOpenChange={(open) => {
                if (!open && editingWeekIndex === index) {
                  setIsDatePickerOpen(false);
                  setEditingWeekIndex(null);
                }
              }}>
                <div
                  className={`group relative flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                    activeWeekIndex === index
                      ? "border border-primary bg-primary/10 text-primary"
                      : "bg-widget-body hover:bg-muted"
                  }`}
                >
                  <PopoverTrigger asChild>
                    <button
                      onClick={() => setActiveWeekIndex(index)}
                      onDoubleClick={() => openDatePicker(index)}
                      className="text-xs flex items-center gap-1"
                      title="Double-click to change date"
                    >
                      <CalendarIcon className="w-2.5 h-2.5" />
                      {week}
                    </button>
                  </PopoverTrigger>
                  {weeks.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWeek(index);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedStartDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            ))}
            
            {/* Add Week Button */}
            <Popover open={isDatePickerOpen && editingWeekIndex === weeks.length} onOpenChange={(open) => {
              if (!open && editingWeekIndex === weeks.length) {
                setIsDatePickerOpen(false);
                setEditingWeekIndex(null);
              }
            }}>
              <PopoverTrigger asChild>
                <button
                  onClick={() => openDatePicker(weeks.length)}
                  className="p-1 hover:bg-primary/20 rounded transition-colors"
                  title="Add Week"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedStartDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={saveAllData}
            disabled={isSaving}
            className={`p-1 rounded transition-colors flex items-center gap-1 ${
              isSaving
                ? "opacity-50 cursor-not-allowed"
                : saveSuccess
                ? "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                : "hover:bg-primary/20 text-primary"
            }`}
            title={isSaving ? "Saving..." : "Save all data"}
          >
            <Save className={`w-3.5 h-3.5 ${isSaving ? "animate-spin" : ""}`} />
            {isSaving && <span className="text-xs">Saving...</span>}
            {saveSuccess && <span className="text-xs">Saved!</span>}
          </button>
          {onSettings && (
            <button
              onClick={onSettings}
              className="p-1 hover:bg-background rounded transition-colors"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
          <button className="p-1 hover:bg-background rounded transition-colors" title="Maximize">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 hover:bg-destructive/20 hover:text-destructive rounded transition-colors"
              title="Remove"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Indicators */}
        <div className="w-[180px] border-r border-border bg-widget-header flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-border">
            <div className="text-xs mb-1">Indicators</div>
            <div className="text-xs text-muted-foreground">Last Updated: {currentDate}</div>
          </div>

          {/* Indicators List */}
          <div className="flex-1 overflow-auto">
            {/* Categories */}
            {categories.map((category) => (
              <div key={category.name} className="border-b border-border">
                <div className="flex items-center justify-between px-3 py-2 hover:bg-widget-body/50 group">
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="flex items-center gap-1.5 flex-1 text-left"
                  >
                    {expandedCategories.has(category.name) ? (
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 flex-shrink-0" />
                    )}
                    <span className="text-sm">{category.name}</span>
                  </button>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAddingIndicator(category.name);
                      }}
                      className="p-0.5 hover:bg-primary/20 rounded"
                      title="Add Indicator"
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCategory(category.name);
                      }}
                      className="p-0.5 hover:bg-destructive/20 rounded"
                      title="Delete Category"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Add Indicator Input */}
                {isAddingIndicator === category.name && (
                  <div className="px-3 pb-2">
                    <input
                      type="text"
                      value={newIndicatorName}
                      onChange={(e) => setNewIndicatorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addIndicator(category.name);
                        if (e.key === "Escape") {
                          setIsAddingIndicator(null);
                          setNewIndicatorName("");
                        }
                      }}
                      placeholder="Indicator name..."
                      className="w-full bg-background border border-primary rounded px-2 py-1 text-xs outline-none"
                      autoFocus
                    />
                  </div>
                )}

                {/* Category Indicators */}
                {expandedCategories.has(category.name) && (
                  <div>
                    {category.indicators.map((indicator) => (
                      <div
                        key={indicator}
                        className="px-3 py-2 hover:bg-widget-body/50 group flex items-center justify-between"
                      >
                        <span className="text-sm flex-1">{indicator}</span>
                        <button
                          onClick={() => deleteIndicator(category.name, indicator)}
                          className="p-0.5 hover:bg-destructive/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Standalone Indicators */}
            {standaloneIndicators.map((indicator) => (
              <div
                key={indicator}
                className="px-3 py-2 border-b border-border hover:bg-widget-body/50 group flex items-center justify-between"
              >
                <span className="text-sm flex-1">{indicator}</span>
                <button
                  onClick={() => deleteIndicator(undefined, indicator)}
                  className="p-0.5 hover:bg-destructive/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}

            {/* Overall */}
            <div className="px-3 py-2 border border-primary bg-primary/10 mx-2 my-2 rounded">
              <span className="text-sm text-primary">Overall</span>
            </div>

            {/* Add Standalone Indicator */}
            {isAddingStandalone ? (
              <div className="px-3 py-2 border-b border-border">
                <input
                  type="text"
                  value={newIndicatorName}
                  onChange={(e) => setNewIndicatorName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addStandaloneIndicator();
                    if (e.key === "Escape") {
                      setIsAddingStandalone(false);
                      setNewIndicatorName("");
                    }
                  }}
                  placeholder="Indicator name..."
                  className="w-full bg-background border border-primary rounded px-2 py-1 text-xs outline-none"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => setIsAddingStandalone(true)}
                className="w-full px-3 py-2 border-b border-border hover:bg-widget-body/50 flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span className="text-sm">Add Indicator</span>
              </button>
            )}

            {/* Add Category */}
            {isAddingCategory ? (
              <div className="px-3 py-2 border-b border-border">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCategory();
                    if (e.key === "Escape") {
                      setIsAddingCategory(false);
                      setNewCategoryName("");
                    }
                  }}
                  placeholder="Category name..."
                  className="w-full bg-background border border-primary rounded px-2 py-1 text-xs outline-none"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => setIsAddingCategory(true)}
                className="w-full px-3 py-2 border-b border-border hover:bg-widget-body/50 flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span className="text-sm">Add Category</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side - Currency Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Currency Headers */}
          <div className="flex border-b border-border bg-widget-header">
            {selectedCurrencies.map((currency) => (
              <div
                key={currency}
                className="flex-1 px-3 py-2 border-r border-border last:border-r-0 text-center"
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl leading-none">{currencyFlags[currency]}</span>
                  <span className="text-sm font-semibold">{currency}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-auto">
            {/* Categories */}
            {categories.map((category) => (
              <div key={category.name}>
                {expandedCategories.has(category.name) && (
                  <>
                    {category.indicators.map((indicator) => (
                      <div key={indicator} className="flex border-b border-border">
                        {selectedCurrencies.map((currency) => (
                          <div
                            key={currency}
                            className="flex-1 border-r border-border last:border-r-0 p-1"
                          >
                            <Select
                              value={scores[currency]?.[indicator] || "Neutral"}
                              onValueChange={(value) => updateScore(currency, indicator, value as BiasValue)}
                            >
                              <SelectTrigger className={`h-8 border ${getBiasColor(scores[currency]?.[indicator] || "Neutral")} hover:opacity-80`}>
                                <SelectValue className="text-sm">
                                  {scores[currency]?.[indicator] || "Neutral"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Very Bullish">Very Bullish</SelectItem>
                                <SelectItem value="Bullish">Bullish</SelectItem>
                                <SelectItem value="Weak Bullish">Weak Bullish</SelectItem>
                                <SelectItem value="Neutral">Neutral</SelectItem>
                                <SelectItem value="Weak Bearish">Weak Bearish</SelectItem>
                                <SelectItem value="Bearish">Bearish</SelectItem>
                                <SelectItem value="Very Bearish">Very Bearish</SelectItem>
                                <SelectItem value="Uptrend">Uptrend</SelectItem>
                                <SelectItem value="Downtrend">Downtrend</SelectItem>
                                <SelectItem value="Range">Range</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}

            {/* Standalone Indicators */}
            {standaloneIndicators.map((indicator) => (
              <div key={indicator} className="flex border-b border-border">
                {selectedCurrencies.map((currency) => (
                  <div
                    key={currency}
                    className="flex-1 border-r border-border last:border-r-0 p-1"
                  >
                    <Select
                      value={scores[currency]?.[indicator] || "Neutral"}
                      onValueChange={(value) => updateScore(currency, indicator, value as BiasValue)}
                    >
                      <SelectTrigger className={`h-8 border ${getBiasColor(scores[currency]?.[indicator] || "Neutral")} hover:opacity-80`}>
                        <SelectValue className="text-sm">
                          {scores[currency]?.[indicator] || "Neutral"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Very Bullish">Very Bullish</SelectItem>
                        <SelectItem value="Bullish">Bullish</SelectItem>
                        <SelectItem value="Weak Bullish">Weak Bullish</SelectItem>
                        <SelectItem value="Neutral">Neutral</SelectItem>
                        <SelectItem value="Weak Bearish">Weak Bearish</SelectItem>
                        <SelectItem value="Bearish">Bearish</SelectItem>
                        <SelectItem value="Very Bearish">Very Bearish</SelectItem>
                        <SelectItem value="Uptrend">Uptrend</SelectItem>
                        <SelectItem value="Downtrend">Downtrend</SelectItem>
                        <SelectItem value="Range">Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            ))}

            {/* Overall Row */}
            <div className="flex p-2 bg-black/30 border-t border-border/50">
              {selectedCurrencies.map((currency) => {
                const overallBias = calculateOverallBias(scores[currency] || {});
                return (
                  <div
                    key={currency}
                    className="flex-1 px-1"
                  >
                    <div className={`h-10 ${getBiasColor(overallBias)} rounded flex items-center justify-center border-2`}>
                      <span className="text-sm">{overallBias}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

