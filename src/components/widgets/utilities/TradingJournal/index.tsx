import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Trash2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Bold, Italic, Underline, Strikethrough, List, ListOrdered, Quote, Code, Link, Image, AlignLeft, AlignCenter, AlignRight, Type, Upload, X, Loader2, Settings2, Calendar as CalendarIcon, Clock, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { getUserTimezoneSync } from "@/utils/systemVariablesClient";
import { 
  getJournalTitles, 
  getJournalData, 
  saveJournalData, 
  updateColumnVisibility,
  saveJournalAnalysis,
  getJournalAnalysis,
  deleteJournalRow,
  saveJournalImage,
  getJournalImages,
  createEnhancedJournalShare,
  type JournalTitle,
  type JournalData,
  type JournalAnalysis,
  type JournalImage
} from "./tradingJournalApi";
import { ConfirmDialog } from "@/components/bloomberg-ui/ConfirmDialog";

interface TradingJournalProps {
  wgid?: string;
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, any>;
}

type NewTradeForm = {
  pair: string;
  date: string;
  direction: "Long" | "Short";
  risk: string;
  status: "Open" | "Closed";
  winLoss: "Win" | "Loss" | "-";
  gain: string;
  tradeStyle: string;
  openPrice: string;
  closePrice: string;
  stopLoss: string;
  takeProfit: string;
  equityBefore: string;
  plannedReward: string;
  openTime: string;
  closeTime: string;
  notes: string;
};

// Time Picker Component - Scrollable Number Picker Style
const TimePicker = ({ value, onChange }: { value: string; onChange: (time: string) => void }) => {
  // Parse initial value
  const parseValue = (val: string) => {
    if (!val) return { h: 0, m: 0 };
    const parts = val.split(':');
    return {
      h: parseInt(parts[0]) || 0,
      m: parseInt(parts[1]) || 0,
    };
  };

  const initialValue = parseValue(value);
  const [hour, setHour] = useState<number>(initialValue.h);
  const [minute, setMinute] = useState<number>(initialValue.m);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const itemHeight = 40;
  const viewportHeight = 200;
  const spacerHeight = 80;
  const viewportCenter = viewportHeight / 2; // 100px from top

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Sync from prop when value changes externally
  useEffect(() => {
    const parsed = parseValue(value);
    if (parsed.h !== hour) {
      setHour(parsed.h);
    }
    if (parsed.m !== minute) {
      setMinute(parsed.m);
    }
  }, [value]);

  // Update parent when hour/minute changes
  const updateTime = useCallback((h: number, m: number) => {
    const newTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (newTime !== value) {
      onChange(newTime);
    }
  }, [value, onChange]);

  // Simplified calculation: scrollTop = value * itemHeight centers the item
  // This works because: item center = spacerHeight + (value * itemHeight) + (itemHeight/2) = 100 + (value * 40)
  // To center: scrollTop = item center - viewport center = (100 + value*40) - 100 = value * 40
  const scrollToValue = (ref: React.RefObject<HTMLDivElement>, val: number) => {
    if (ref.current) {
      isScrollingRef.current = true;
      ref.current.scrollTop = val * itemHeight;
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
    }
  };

  // Initial scroll setup after mount - ensure refs are ready
  useEffect(() => {
    const setupScroll = () => {
      if (hourRef.current) {
        hourRef.current.scrollTop = hour * itemHeight;
      }
      if (minuteRef.current) {
        minuteRef.current.scrollTop = minute * itemHeight;
      }
    };
    
    // Try immediately, then with a small delay as fallback
    setupScroll();
    const timer = setTimeout(setupScroll, 10);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Update scroll when hour/minute state changes (but not during user scroll)
  useEffect(() => {
    if (!isScrollingRef.current && hourRef.current) {
      hourRef.current.scrollTop = hour * itemHeight;
    }
  }, [hour]);

  useEffect(() => {
    if (!isScrollingRef.current && minuteRef.current) {
      minuteRef.current.scrollTop = minute * itemHeight;
    }
  }, [minute]);

  const handleScroll = useCallback((ref: React.RefObject<HTMLDivElement>, setValue: (val: number) => void, max: number, isHour: boolean) => {
    if (!ref.current || isScrollingRef.current) return;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const scrollTop = ref.current.scrollTop;
    // Calculate which item is centered: value = scrollTop / itemHeight (rounded)
    // Since scrollTop = value * itemHeight centers item, reverse is: value = scrollTop / itemHeight
    const newValue = Math.round(scrollTop / itemHeight);
    const clampedValue = Math.max(0, Math.min(max, newValue));
    
    // Update immediately if value changed
    if (isHour && clampedValue !== hour) {
      setValue(clampedValue);
      updateTime(clampedValue, minute);
    } else if (!isHour && clampedValue !== minute) {
      setValue(clampedValue);
      updateTime(hour, clampedValue);
    }
  }, [hour, minute, updateTime, itemHeight]);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className="flex gap-6 p-4 bg-widget-body">
      {/* Hour Picker */}
      <div className="flex flex-col items-center flex-1">
        <div className="text-xs font-medium text-orange-300 mb-2">Hour</div>
        <div className="relative w-16 h-[200px] overflow-hidden">
          {/* Selection highlight */}
          <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 bg-orange-500/20 border-y border-orange-500/40 z-10 pointer-events-none" />
          {/* Scrollable list */}
          <div
            ref={hourRef}
            className="overflow-y-auto h-full scroll-smooth snap-y snap-mandatory hide-scrollbar"
            onScroll={() => handleScroll(hourRef, setHour, 23, true)}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="h-[80px]" /> {/* Spacer */}
            {hours.map((h) => (
              <div
                key={h}
                className="h-10 flex items-center justify-center text-base font-medium snap-center cursor-pointer transition-colors"
                onClick={() => {
                  setHour(h);
                  scrollToValue(hourRef, h);
                  updateTime(h, minute);
                }}
              >
                <span className={hour === h ? 'text-orange-500 font-semibold scale-110' : 'text-foreground'}>
                  {String(h).padStart(2, '0')}
                </span>
              </div>
            ))}
            <div className="h-[80px]" /> {/* Spacer */}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="flex items-center text-2xl font-bold text-orange-500 pt-8">:</div>

      {/* Minute Picker */}
      <div className="flex flex-col items-center flex-1">
        <div className="text-xs font-medium text-orange-300 mb-2">Minute</div>
        <div className="relative w-16 h-[200px] overflow-hidden">
          {/* Selection highlight */}
          <div className="absolute top-1/2 left-0 right-0 h-10 -translate-y-1/2 bg-orange-500/20 border-y border-orange-500/40 z-10 pointer-events-none" />
          {/* Scrollable list */}
          <div
            ref={minuteRef}
            className="overflow-y-auto h-full scroll-smooth snap-y snap-mandatory hide-scrollbar"
            onScroll={() => handleScroll(minuteRef, setMinute, 59, false)}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="h-[80px]" /> {/* Spacer */}
            {minutes.map((m) => (
              <div
                key={m}
                className="h-10 flex items-center justify-center text-base font-medium snap-center cursor-pointer transition-colors"
                onClick={() => {
                  setMinute(m);
                  scrollToValue(minuteRef, m);
                  updateTime(hour, m);
                }}
              >
                <span className={minute === m ? 'text-orange-500 font-semibold scale-110' : 'text-foreground'}>
                  {String(m).padStart(2, '0')}
                </span>
              </div>
            ))}
            <div className="h-[80px]" /> {/* Spacer */}
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom Date Picker Component
const CustomDatePicker = ({ value, onChange }: { value: string; onChange: (date: string) => void }) => {
  const [currentDate, setCurrentDate] = useState<Date>(value ? new Date(value) : new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (number | null)[] = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
    onChange(format(newDate, "yyyy-MM-dd"));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    );
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="p-4 bg-widget-body">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          className="h-8 w-8 flex items-center justify-center text-orange-500 hover:bg-orange-500/10 border border-orange-500/30 rounded transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-base font-medium text-foreground">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className="h-8 w-8 flex items-center justify-center text-orange-500 hover:bg-orange-500/10 border border-orange-500/30 rounded transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-base font-medium text-muted-foreground text-center py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-10" />;
          }
          const selected = isSelected(day);
          const today = isToday(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateSelect(day)}
              className={`h-10 w-10 rounded-md text-base font-medium transition-all ${
                selected
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : today
                  ? 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30'
                  : 'text-foreground hover:bg-orange-500/10'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const NUMERIC_TRADE_FIELDS: Array<keyof Trade> = [
  "risk",
  "gain",
  "openPrice",
  "closePrice",
  "plannedReward",
  "stopLoss",
  "takeProfit",
  "equityBefore",
  "equityAfter",
  "pips",
  "mfePips",
  "maePips",
  "maePercent",
  "atrPercent",
];

const MOCK_TRADES: Trade[] = [
  {
    id: 1,
    pair: "EURUSD",
    date: "2025-08-01",
    direction: "Long",
    risk: 1,
    status: "Closed",
    winLoss: "Win",
    gain: 10000,
    tradeStyle: "Swing Trading",
    openPrice: 1.14000,
    closePrice: 1.15000,
    plannedReward: 0.00,
    stopLoss: 1.13000,
    takeProfit: 1.15000,
    equityBefore: 100000.00,
    equityAfter: 110000.00,
    pips: 0.0,
    mfePips: 0,
    maePips: 0,
    maePercent: 0,
    quarter: "Q3",
    year: 2025,
    duration: "-",
    atrPercent: 0,
    openTime: "-",
    closeTime: "-",
  },
  {
    id: 2,
    pair: "AUDCAD",
    date: "2025-08-15",
    direction: "Long",
    risk: 1,
    status: "Open",
    winLoss: "Win",
    gain: 0,
    tradeStyle: "Swing Trading",
    openPrice: 0.92000,
    closePrice: 0,
    plannedReward: 0.00,
    stopLoss: 0.91000,
    takeProfit: 0.93500,
    equityBefore: 110000.00,
    equityAfter: 110000.00,
    pips: 0.0,
    mfePips: 0,
    maePips: 0,
    maePercent: 0,
    quarter: "Q3",
    year: 2025,
    duration: "-",
    atrPercent: 0,
    openTime: "-",
    closeTime: "-",
  },
  {
    id: 3,
    pair: "AUDCHF",
    date: "2025-09-10",
    direction: "Short",
    risk: 1,
    status: "Closed",
    winLoss: "Loss",
    gain: -2000,
    tradeStyle: "Event Trading",
    openPrice: 0.58000,
    closePrice: 0.58500,
    plannedReward: 0.00,
    stopLoss: 0.58800,
    takeProfit: 0.57000,
    equityBefore: 110000.00,
    equityAfter: 108000.00,
    pips: 0.0,
    mfePips: 0,
    maePips: 0,
    maePercent: 0,
    quarter: "Q3",
    year: 2025,
    duration: "-",
    atrPercent: 0,
    openTime: "-",
    closeTime: "-",
  },
];

// Mock chart data for selected trade
const MOCK_CHART_DATA = [
  { date: "14 Jul", price: 1.1600 },
  { date: "21 Jul", price: 1.1650 },
  { date: "28 Jul", price: 1.1580 },
  { date: "4 Aug", price: 1.1700 },
  { date: "11 Aug", price: 1.1620 },
  { date: "18 Aug", price: 1.1750 },
  { date: "25 Aug", price: 1.1680 },
  { date: "1 Sep", price: 1.1800 },
  { date: "8 Sep", price: 1.1720 },
  { date: "15 Sep", price: 1.1850 },
  { date: "22 Sep", price: 1.1900 },
  { date: "29 Sep", price: 1.1780 },
  { date: "6 Oct", price: 1.1950 },
  { date: "13 Oct", price: 1.1820 },
  { date: "20 Oct", price: 1.1600 },
  { date: "27 Oct", price: 1.1400 },
];

export default function TradingJournal({ wgid, onSettings, onRemove, onFullscreen, settings }: TradingJournalProps) {
  const [activeTab, setActiveTab] = useState("journal");
  const [expandedTradeId, setExpandedTradeId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState("charts");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set(["analysis"]));
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<{ file: File; preview: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(9); // October (0-indexed)
  const [currentYear, setCurrentYear] = useState(2025);
  
  // API state
  const [trades, setTrades] = useState<Trade[]>([]);
  const [journalTitles, setJournalTitles] = useState<JournalTitle[]>([]);
  const [selectedJournalTitle, setSelectedJournalTitle] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tradeAnalysis, setTradeAnalysis] = useState<Record<number, JournalAnalysis>>({});
  const [tradeImages, setTradeImages] = useState<Record<number, JournalImage[]>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [tradeChartData, setTradeChartData] = useState<Record<number, Array<{ date: string; price: number }>>>({});
  const [loadingChartData, setLoadingChartData] = useState<Record<number, boolean>>({});
  const [fetchedChartData, setFetchedChartData] = useState<Set<number>>(new Set()); // Track which trades we've attempted to fetch
  const [isAddingTrade, setIsAddingTrade] = useState(false);
  const [newTradeForm, setNewTradeForm] = useState<NewTradeForm>({
    pair: "",
    date: new Date().toISOString().split("T")[0],
    direction: "Long" as "Long" | "Short",
    risk: "",
    status: "Open" as "Open" | "Closed",
    winLoss: "-" as "Win" | "Loss" | "-",
    gain: "",
    tradeStyle: "Discretionary",
    openPrice: "",
    closePrice: "",
    stopLoss: "",
    takeProfit: "",
    equityBefore: "",
    plannedReward: "",
    openTime: "",
    closeTime: "",
    notes: "",
  });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);
  const prevSelectedJournalTitleRef = useRef<number | null>(null);
  const prevSettingsJournalIDRef = useRef<string | undefined>(undefined);
  const mountTimeRef = useRef<number>(Date.now());
  const isLoadingDataRef = useRef(false);
  const lastLoadedJournalIDRef = useRef<number | null>(null);
  const loadJournalDataRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const [userTimezone, setUserTimezone] = useState<string>(getUserTimezoneSync);

  // Extract WidgetID from wgid prop
  // Listen for timezone changes
  useEffect(() => {
    const handleTimezoneChange = (event: CustomEvent) => {
      const { timezoneId } = event.detail;
      if (timezoneId) {
        setUserTimezone(timezoneId);
        // Reload trades to reformat times with new timezone
        if (loadJournalDataRef.current) {
          loadJournalDataRef.current();
        }
      }
    };

    window.addEventListener('timezoneChanged', handleTimezoneChange as EventListener);
    return () => {
      window.removeEventListener('timezoneChanged', handleTimezoneChange as EventListener);
    };
  }, []);

  const getWidgetID = useCallback((): number => {
    if (wgid) {
      const numericMatch = wgid.match(/\d+/);
      if (numericMatch) {
        const parsed = parseInt(numericMatch[0], 10);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }
    // Fallback: try to get from settings
    if (settings?.widgetID) {
      return parseInt(settings.widgetID, 10);
    }
    // Last resort: generate a placeholder (should not happen in production)
    return Date.now();
  }, [wgid, settings]);

  // Get JournalID (Title) from settings or use first available
  const getJournalID = useCallback((): number | null => {
    if (selectedJournalTitle) {
      return selectedJournalTitle;
    }
    if (settings?.journalID) {
      const parsed = parseInt(settings.journalID, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    if (journalTitles.length > 0) {
      return journalTitles[0].ID || journalTitles[0].Title || null;
    }
    return null;
  }, [settings, selectedJournalTitle, journalTitles]);

  // Load journal titles
  const loadJournalTitles = useCallback(
    async (preferredJournalId?: number | null) => {
    try {
      const titles = await getJournalTitles();
      setJournalTitles(titles);
      
        if (titles.length === 0) {
        setError('No journals found. Please create a journal first.');
          setSelectedJournalTitle(null);
        setIsLoading(false);
          return;
        }

        // Priority: preferredJournalId > settings.journalID > current selection > first journal
        const getPreferredId = (): number | null => {
          if (preferredJournalId) return preferredJournalId;
          if (settings?.journalID) {
            const parsed = parseInt(settings.journalID, 10);
            if (!isNaN(parsed) && parsed > 0 && titles.some((title) => (title.ID || title.Title) === parsed)) {
              return parsed;
            }
          }
          return null;
        };

        const pickFallback = (): number | null => titles[0].ID || titles[0].Title || null;

        setSelectedJournalTitle((current) => {
          const preferred = getPreferredId();
          const newValue = preferred 
            ? preferred
            : (current && titles.some((title) => (title.ID || title.Title) === current))
              ? current
              : pickFallback();
          
          // Only update if the value actually changed
          if (current === newValue) {
            return current;
          }
          
          return newValue;
        });
    } catch (err) {
      console.error('Error loading journal titles:', err);
      setError(err instanceof Error ? err.message : 'Failed to load journal titles');
      setIsLoading(false);
    }
    },
    [settings?.journalID]
  );

  // Load journal data
  const loadJournalData = useCallback(async () => {
      const journalID = getJournalID();
      const widgetID = getWidgetID();
      
    // Prevent duplicate calls for the same journal
    if (isLoadingDataRef.current && lastLoadedJournalIDRef.current === journalID) {
      return;
    }
    
    isLoadingDataRef.current = true;
    lastLoadedJournalIDRef.current = journalID;
    
    try {
      setIsLoading(true);
      setError(null);
      
      if (!journalID || journalID <= 0) {
        setError('Please select a journal or create one first.');
        setIsLoading(false);
        isLoadingDataRef.current = false;
        return;
      }
      
      if (!widgetID || widgetID <= 0) {
        setError('WidgetID is required. Please check widget configuration.');
        setIsLoading(false);
        isLoadingDataRef.current = false;
        return;
      }
      
      const data = await getJournalData(journalID, widgetID);
      
      if (!Array.isArray(data)) {
        setTrades([]);
        hasLoadedRef.current = true;
        setIsLoading(false);
        isLoadingDataRef.current = false;
        return;
      }
      
      if (data.length === 0) {
        setTrades([]);
        hasLoadedRef.current = true;
        setIsLoading(false);
        isLoadingDataRef.current = false;
        return;
      }
      
      
      // Map API data to Trade interface - API uses: ID, Pair, Trade_Date, Direction, Status, Win_Loss, etc.
      const mappedTrades: Trade[] = data
        .filter((item: any) => item && item.ID) // Filter out invalid entries
        .map((item: any, index: number) => {
          // Helper to safely parse numbers (handles null/undefined)
          const safeParseFloat = (val: any): number => {
            if (val === null || val === undefined || val === '') return 0;
            const parsed = parseFloat(val);
            return isNaN(parsed) ? 0 : parsed;
          };
          
          const safeParseInt = (val: any, defaultValue: number): number => {
            if (val === null || val === undefined || val === '') return defaultValue;
            const parsed = parseInt(val, 10);
            return isNaN(parsed) ? defaultValue : parsed;
          };
          
          // Format date - handle null/undefined
          let tradeDate = item.Trade_Date || item.date || '';
          if (!tradeDate && item.Created_At) {
            // Fallback to Created_At if Trade_Date is missing
            tradeDate = new Date(item.Created_At).toISOString().split('T')[0];
          }
          if (!tradeDate) {
            tradeDate = new Date().toISOString().split('T')[0];
          }
          
          // Format times - handle null/undefined
          const formatTime = (timeStr: string | null | undefined, timezone: string): string => {
            if (!timeStr) return '-';
            try {
              return new Date(timeStr).toLocaleTimeString('en-US', { timeZone: timezone, hour12: false, hour: '2-digit', minute: '2-digit' });
            } catch {
              return timeStr.toString();
            }
          };
          
          const mapped: Trade = {
            id: item.ID || item.TradeID || item.id || index + 1,
            rowId: safeParseInt(item.Row_ID || item.RowID || item.rowId, 0),
            pair: item.Pair || item.pair || 'N/A',
            date: tradeDate,
            direction: (item.Direction || 'Long') as "Long" | "Short",
            risk: safeParseFloat(item.Risk || item.risk),
            status: (item.Status || 'Open') as "Open" | "Closed",
            winLoss: (item.Win_Loss || item.WinLoss || '-') as "Win" | "Loss" | "-",
            gain: safeParseFloat(item.Pnl_no_Interest || item.Pnl || item.gain),
            tradeStyle: item.Trade_Style || item.TradeStyle || item.tradeStyle || '',
            openPrice: safeParseFloat(item.Open_Price || item.openPrice),
            closePrice: safeParseFloat(item.Close_Price || item.closePrice),
            plannedReward: safeParseFloat(item.Planned_Reward || item.plannedReward),
            stopLoss: safeParseFloat(item.Stop_Loss || item.stopLoss),
            takeProfit: safeParseFloat(item.Take_Profit || item.takeProfit),
            equityBefore: safeParseFloat(item.Equity_Before || item.equityBefore),
            equityAfter: safeParseFloat(item.Equity_After || item.equityAfter),
            pips: safeParseFloat(item.Pips || item.pips),
            mfePips: safeParseFloat(item.Mfe_Pips || item.MFE_Pips || item.mfePips),
            maePips: safeParseFloat(item.Mae_Pips || item.MAE_Pips || item.maePips),
            maePercent: safeParseFloat(item.Mae_Percent || item.MAE_Percent || item.maePercent),
            quarter: item.Quarter || item.quarter || '',
            year: safeParseInt(item.Year || item.year, new Date().getFullYear()),
            duration: item.Duration || item.duration || '-',
            atrPercent: safeParseFloat(item.Atr_Percent || item.ATR_Percent || item.atrPercent),
            openTime: formatTime(item.Open_Time || item.openTime, userTimezone),
            closeTime: formatTime(item.Close_Time || item.closeTime, userTimezone),
            notes: item.Notes || item.notes || item.Note || item.note || '',
          };
          
          return mapped;
        });
      
      setTrades(mappedTrades);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Error loading journal data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load journal data');
      setTrades([]);
      hasLoadedRef.current = true;
    } finally {
      setIsLoading(false);
      isLoadingDataRef.current = false;
    }
  }, [getJournalID, getWidgetID, selectedJournalTitle]);
  
  // Store latest loadJournalData in ref to avoid dependency issues
  useEffect(() => {
    loadJournalDataRef.current = loadJournalData;
  }, [loadJournalData]);

  // Load analysis for a trade
  const loadTradeAnalysis = useCallback(async (tradeID: number) => {
    const journalID = getJournalID();
    if (!journalID || !tradeID) return;
    
    try {
      const analysis = await getJournalAnalysis(journalID, tradeID);
      if (analysis) {
        setTradeAnalysis(prev => ({ ...prev, [tradeID]: analysis }));
      }
    } catch (err) {
      console.error('Error loading trade analysis:', err);
    }
  }, [getJournalID]);

  // Load images for a trade
  // Helper to construct full image URL from imagePath
  const getImageUrl = useCallback((imagePath: string): string => {
    if (!imagePath) return '';
    // If already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // Construct full URL from imagePath
    // API returns: /journal-images/filename.jpg
    // Accessible URL: https://frontendapi.primemarket-terminal.com/api/images/journal-images/filename.jpg
    const baseUrl = 'https://frontendapi.primemarket-terminal.com';
    // Remove leading slash if present
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    // Split path into directory and filename, encode filename only (spaces in filename need encoding)
    const pathParts = cleanPath.split('/');
    const directory = pathParts.slice(0, -1).join('/'); // Everything except last part
    const filename = pathParts[pathParts.length - 1]; // Last part (filename)
    const encodedFilename = encodeURIComponent(filename);
    const fullPath = directory ? `${directory}/${encodedFilename}` : encodedFilename;
    return `${baseUrl}/api/images/${fullPath}`;
  }, []);

  const loadTradeImages = useCallback(async (tradeID: number) => {
    const journalID = getJournalID();
    if (!journalID || !tradeID) return;
    
    try {
      const images = await getJournalImages(journalID, tradeID);
      setTradeImages(prev => ({ ...prev, [tradeID]: images }));
      
      // Map image URLs to uploadedImages state - construct full URLs
      // API returns: { status: "success", images: [{ ImagePath: "/journal-images/..." }] }
      const imageUrls = images
        .map((img: any) => {
          // Try ImagePath first (capital I, capital P - from GetJournalImages API)
          if (img.ImagePath) {
            return getImageUrl(img.ImagePath);
          }
          // Try imagePath (lowercase - from saveJournalImage response)
          if (img.imagePath) {
            return getImageUrl(img.imagePath);
          }
          // Try ImageURL
          if (img.ImageURL) {
            return getImageUrl(img.ImageURL);
          }
          // Try ImageData - could be base64, data URL, or imagePath
          if (img.ImageData) {
            // If ImageData is a base64 or data URL, return as is
            if (img.ImageData.startsWith('data:') || img.ImageData.startsWith('http')) {
              return img.ImageData;
            }
            // Otherwise treat as imagePath
            return getImageUrl(img.ImageData);
          }
          return '';
        })
        .filter(Boolean);
      setUploadedImages(imageUrls);
    } catch (err) {
      console.error('Error loading trade images:', err);
    }
  }, [getJournalID, getImageUrl]);

  const selectedJournalName = useMemo(() => {
    if (!selectedJournalTitle) return null;
    const match = journalTitles.find(
      (title) => (title.ID || title.Title) === selectedJournalTitle
    );
    return match?.Name || match?.JournalName || `Journal ${selectedJournalTitle}`;
  }, [journalTitles, selectedJournalTitle]);

  const mapTradeToJournalData = useCallback(
    (tradeData: Trade, journalID: number, widgetID: number): JournalData => {
      return {
        ...(tradeData.id > 0 ? { ID: tradeData.id, TradeID: tradeData.id } : {}),
        Title: journalID,
        TitleID: journalID,
        JournalID: journalID,
        JournalId: journalID,
        journalId: journalID,
        WidgetID: widgetID,
        Journal_ID: journalID,
          Pair: tradeData.pair,
          Trade_Date: tradeData.date,
          Direction: tradeData.direction,
          Risk: tradeData.risk,
          Status: tradeData.status,
          Win_Loss: tradeData.winLoss,
        Pnl_no_Interest: tradeData.gain,
          Pnl: tradeData.gain,
          Trade_Style: tradeData.tradeStyle,
          Open_Price: tradeData.openPrice,
          Close_Price: tradeData.closePrice,
          Planned_Reward: tradeData.plannedReward,
          Stop_Loss: tradeData.stopLoss,
          Take_Profit: tradeData.takeProfit,
          Equity_Before: tradeData.equityBefore,
          Equity_After: tradeData.equityAfter,
          Pips: tradeData.pips,
        Mfe_Pips: tradeData.mfePips,
        Mae_Pips: tradeData.maePips,
        Mae_Percent: tradeData.maePercent,
          Quarter: tradeData.quarter,
          Year: tradeData.year,
          Duration: tradeData.duration,
        Atr_Percent: tradeData.atrPercent,
          Open_Time: tradeData.openTime,
          Close_Time: tradeData.closeTime,
          Notes: tradeData.notes,
        };
    },
    []
  );

  // Save journal data (with debouncing)
  const saveJournalDataDebounced = useCallback(async (tradeData: Trade) => {
    if (!hasLoadedRef.current) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves - wait 1 second after last change
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        const journalID = getJournalID();
        const widgetID = getWidgetID();
        
        if (!journalID || !widgetID) {
          return;
        }

        const journalData = mapTradeToJournalData(tradeData, journalID, widgetID);
        await saveJournalData(journalData);
      } catch (err) {
        console.error('Error saving journal data:', err);
        setError(err instanceof Error ? err.message : 'Failed to save journal data');
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1 second debounce
  }, [getJournalID, getWidgetID, mapTradeToJournalData]);

  const handleTradeFieldChange = useCallback(
    (tradeID: number, field: keyof Trade, value: string) => {
      setTrades((prev) =>
        prev.map((trade) => {
          if (trade.id !== tradeID) return trade;
          const parsedValue = NUMERIC_TRADE_FIELDS.includes(field)
            ? Number(value) || 0
            : (value as any);
          const updatedTrade = {
            ...trade,
            [field]: parsedValue,
          };
          saveJournalDataDebounced(updatedTrade);
          return updatedTrade;
        })
      );
    },
    [saveJournalDataDebounced]
  );

  const handleAnalysisFieldChange = useCallback(
    (tradeID: number, field: "Analysis" | "Risk" | "PostAnalysis", value: string) => {
      const journalID = getJournalID();
      setTradeAnalysis((prev) => {
        const existing = prev[tradeID] || { JournalID: journalID ?? 0, TradeID: tradeID };
        return {
          ...prev,
          [tradeID]: {
            ...existing,
            JournalID: journalID ?? existing.JournalID ?? 0,
            TradeID: tradeID,
            [field]: value,
          },
        };
      });
    },
    [getJournalID]
  );

  const handleSaveAnalysis = useCallback(
    async (tradeID: number, analysis: Partial<JournalAnalysis>) => {
      const journalID = getJournalID();
      if (!journalID || !tradeID) {
        setError('JournalID and TradeID are required');
        return;
      }
      
      try {
        setIsSaving(true);
        await saveJournalAnalysis({
          JournalID: journalID,
          TradeID: tradeID,
          Analysis: analysis.Analysis,
          Risk: analysis.Risk,
          PostAnalysis: analysis.PostAnalysis,
        });
        // Reload analysis
        await loadTradeAnalysis(tradeID);
      } catch (err) {
        console.error('Error saving analysis:', err);
        setError(err instanceof Error ? err.message : 'Failed to save analysis');
      } finally {
        setIsSaving(false);
      }
    },
    [getJournalID, loadTradeAnalysis]
  );

  const handleAnalysisBlur = useCallback(
    (tradeID: number) => {
      const journalID = getJournalID();
      if (!journalID) {
        setError('JournalID is required to save analysis');
        return;
      }
      const analysisEntry = tradeAnalysis[tradeID];
      if (!analysisEntry) return;
      handleSaveAnalysis(tradeID, {
        JournalID: journalID,
        TradeID: tradeID,
        Analysis: analysisEntry.Analysis,
        Risk: analysisEntry.Risk,
        PostAnalysis: analysisEntry.PostAnalysis,
      });
    },
    [getJournalID, tradeAnalysis, handleSaveAnalysis]
  );


  const resetNewTradeForm = useCallback(() => {
    setNewTradeForm({
      pair: "",
      date: new Date().toISOString().split("T")[0],
      direction: "Long",
      risk: "",
      status: "Open",
      winLoss: "-",
      gain: "",
      tradeStyle: "Discretionary",
      openPrice: "",
      closePrice: "",
      stopLoss: "",
      takeProfit: "",
      equityBefore: "",
      plannedReward: "",
      openTime: "",
      closeTime: "",
      notes: "",
    });
  }, []);

  const generateSampleTradeData = useCallback((): NewTradeForm => {
    const pairs = [
      "EURUSD",
      "GBPUSD",
      "USDJPY",
      "AUDCAD",
      "AUDUSD",
      "USDCAD",
      "NZDUSD",
      "EURGBP",
      "EURJPY",
      "GBPJPY",
      "USDCHF",
      "EURCHF",
      "AUDNZD",
      "CADJPY",
      "CHFJPY",
      "AUD",
      "CAD",
      "CHF",
      "EUR",
      "GBP",
      "JPY",
      "NZD",
      "USD",
    ];
    const styles = ["Discretionary", "Swing Trading", "Breakout", "Event Trading", "Scalping"];
    const directions: Array<"Long" | "Short"> = ["Long", "Short"];

    const randomPick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const now = new Date();
    const randomDaysOffset = Math.floor(Math.random() * 30);
    const tradeDate = new Date(now.getTime() - randomDaysOffset * 24 * 60 * 60 * 1000);

    const direction = randomPick(directions);
    const status: "Open" | "Closed" = "Closed";
    const winLoss: "Win" | "Loss" = randomPick(["Win", "Loss"]);

    const entryPrice = Number((Math.random() * (1.5 - 0.8) + 0.8).toFixed(4));
    const volatility = Number((Math.random() * 0.01).toFixed(4));
    const closePrice =
      Number(
        (
          entryPrice +
          (direction === "Long" ? volatility : -volatility) * (winLoss === "Win" ? 1 : -1)
        ).toFixed(4)
      );
    const stopLoss = Number((entryPrice - 0.002 * (direction === "Long" ? 1 : -1)).toFixed(4));
    const takeProfit = Number((entryPrice + 0.003 * (direction === "Long" ? 1 : -1)).toFixed(4));

    const equity = Math.floor(Math.random() * 9000) + 1000;
    const gain =
      Number((equity * (Math.random() * 0.02)).toFixed(2)) * (winLoss === "Win" ? 1 : -1);

    const plannedReward = Number((Math.abs(takeProfit - entryPrice) * 10000).toFixed(2));
    const risk = Number((Math.random() * 2).toFixed(2));

    return {
      pair: randomPick(pairs),
      date: tradeDate.toISOString().split("T")[0],
      direction,
      risk: String(risk),
      status,
      winLoss,
      gain: String(gain),
      tradeStyle: randomPick(styles),
      openPrice: String(entryPrice),
      closePrice: String(closePrice),
      stopLoss: String(stopLoss),
      takeProfit: String(takeProfit),
      equityBefore: String(equity),
      plannedReward: String(plannedReward),
      openTime: "09:30",
      closeTime: status === "Closed" ? "15:45" : "",
      notes: "Auto-generated test entry",
    };
  }, []);

  const handleNewTradeFieldChange = useCallback(
    (field: keyof NewTradeForm, value: string) => {
      setNewTradeForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleAddTrade = useCallback(() => {
    const journalID = getJournalID();
    if (!journalID) {
      setError("Select a journal before adding a trade.");
      return;
    }
    resetNewTradeForm();
    setIsAddingTrade(true);
  }, [getJournalID, resetNewTradeForm]);

  const handlePrefillTestTrade = useCallback(() => {
    setNewTradeForm(generateSampleTradeData());
  }, [generateSampleTradeData]);

  const handleCancelAddTrade = useCallback(() => {
    setIsAddingTrade(false);
    resetNewTradeForm();
  }, [resetNewTradeForm]);

  const handleSubmitNewTrade = useCallback(async () => {
    const journalID = getJournalID();
    const widgetID = getWidgetID();
    if (!journalID || !widgetID) {
      setError("JournalID and WidgetID are required to add a trade.");
      return;
    }

    if (!newTradeForm.pair.trim()) {
      setError("Symbol/Pair is required");
      return;
    }
    if (!newTradeForm.date) {
      setError("Trade date is required");
      return;
    }
    if (!newTradeForm.equityBefore || Number(newTradeForm.equityBefore) <= 0) {
      setError("Equity Before is required and must be positive");
      return;
    }

    const parseNumber = (value: string, fallback = 0) => {
      if (!value) return fallback;
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? fallback : parsed;
    };

    const tradeDate = new Date(newTradeForm.date);
    const tradeDateISO = tradeDate.toISOString().split("T")[0];
    const newTrade: Trade = {
      id: Date.now(),
      rowId: 0, // Will be assigned by server when saved
      pair: newTradeForm.pair.trim().toUpperCase(),
      date: tradeDateISO,
      direction: newTradeForm.direction,
      risk: parseNumber(newTradeForm.risk),
      status: newTradeForm.status,
      winLoss: newTradeForm.winLoss,
      gain: parseNumber(newTradeForm.gain),
      tradeStyle: newTradeForm.tradeStyle,
      openPrice: parseNumber(newTradeForm.openPrice),
      closePrice: parseNumber(newTradeForm.closePrice),
      plannedReward: parseNumber(newTradeForm.plannedReward),
      stopLoss: parseNumber(newTradeForm.stopLoss),
      takeProfit: parseNumber(newTradeForm.takeProfit),
      equityBefore: parseNumber(newTradeForm.equityBefore),
      equityAfter: parseNumber(newTradeForm.equityBefore) + parseNumber(newTradeForm.gain),
      pips: 0,
      mfePips: 0,
      maePips: 0,
      maePercent: 0,
      quarter: `Q${Math.floor(tradeDate.getMonth() / 3) + 1}`,
      year: tradeDate.getFullYear(),
      duration: "-",
      atrPercent: 0,
      openTime: newTradeForm.openTime
        ? `${tradeDateISO}T${newTradeForm.openTime}:00Z`
        : `${tradeDateISO}T00:00:00Z`,
      closeTime: newTradeForm.closeTime
        ? `${tradeDateISO}T${newTradeForm.closeTime}:00Z`
        : `${tradeDateISO}T00:00:00Z`,
      notes: newTradeForm.notes,
    };

    setTrades((prev) => [newTrade, ...prev]);

    try {
      setIsSaving(true);
      const payload = mapTradeToJournalData(newTrade, journalID, widgetID);
      delete payload.ID;
      delete payload.TradeID;
      await saveJournalData(payload);
      await loadJournalData();
      setIsAddingTrade(false);
      resetNewTradeForm();
    } catch (err) {
      console.error("Error adding trade:", err);
      setError(err instanceof Error ? err.message : "Failed to add trade");
    } finally {
      setIsSaving(false);
    }
  }, [getJournalID, getWidgetID, mapTradeToJournalData, loadJournalData, newTradeForm, resetNewTradeForm]);

  // Track component mount
  useEffect(() => {
    // Reset refs on mount to ensure fresh state
    prevSelectedJournalTitleRef.current = null;
    lastLoadedJournalIDRef.current = null;
    isLoadingDataRef.current = false;
    return () => {
      // Reset refs on unmount
      prevSelectedJournalTitleRef.current = null;
      lastLoadedJournalIDRef.current = null;
      isLoadingDataRef.current = false;
    };
  }, []);

  // Track selectedJournalTitle state changes (for logging only, don't update ref here)
  useEffect(() => {
    const prev = prevSelectedJournalTitleRef.current;
    if (prev !== selectedJournalTitle) {
      // Reset loading flag when journal changes (but don't update ref here - let main useEffect do it)
      if (prev !== null && prev !== selectedJournalTitle) {
        isLoadingDataRef.current = false;
        lastLoadedJournalIDRef.current = null;
      }
    }
  }, [selectedJournalTitle]);

  // Track settings.journalID changes
  useEffect(() => {
    const prev = prevSettingsJournalIDRef.current;
    if (prev !== settings?.journalID) {
      prevSettingsJournalIDRef.current = settings?.journalID;
    }
  }, [settings?.journalID]);

  useEffect(() => {
    loadJournalTitles();
  }, [loadJournalTitles]);

  useEffect(() => {
    const prev = prevSelectedJournalTitleRef.current;
    const lastLoaded = lastLoadedJournalIDRef.current;
    const isCurrentlyLoading = isLoadingDataRef.current;
    
    // Check if value actually changed
    const hasChanged = prev !== selectedJournalTitle;
    
    // Load if:
    // 1. We have a journal ID AND
    // 2. (The value changed OR we haven't loaded this journal yet) AND
    // 3. We're not currently loading this journal
    if (selectedJournalTitle && selectedJournalTitle > 0) {
      const needsLoad = (hasChanged || lastLoaded !== selectedJournalTitle) && !(isCurrentlyLoading && lastLoaded === selectedJournalTitle);
      
      if (needsLoad) {
        // Use ref to avoid dependency on loadJournalData function
        if (loadJournalDataRef.current) {
          loadJournalDataRef.current();
        }
        // Update ref after scheduling the load
        prevSelectedJournalTitleRef.current = selectedJournalTitle;
      }
    } else {
      if (!selectedJournalTitle) {
        prevSelectedJournalTitleRef.current = null;
      }
    }
  }, [selectedJournalTitle]);

  useEffect(() => {
    const prevSettingsID = prevSettingsJournalIDRef.current;
    const currentSettingsID = settings?.journalID;
    
    if (!currentSettingsID) {
      return;
    }
    
    const parsed = parseInt(currentSettingsID, 10);
    if (isNaN(parsed) || parsed <= 0) {
      return;
    }
    
    // Check if selected journal matches settings journal
    if (parsed === selectedJournalTitle) {
      // Update ref even if no change needed
      if (prevSettingsID !== currentSettingsID) {
        prevSettingsJournalIDRef.current = currentSettingsID;
      }
      return;
    }
    
    // Update selected journal to match settings
    setSelectedJournalTitle(parsed);
    prevSettingsJournalIDRef.current = currentSettingsID;
  }, [settings?.journalID, selectedJournalTitle]);

  // Load images when images tab is selected
  useEffect(() => {
    if (expandedTradeId && detailTab === "images") {
      loadTradeImages(expandedTradeId);
    } else if (!expandedTradeId) {
      // Clear images when no trade is selected
      setUploadedImages([]);
      setSelectedImagePreviews([]);
    }
  }, [expandedTradeId, detailTab, loadTradeImages]);

  // Cleanup preview URLs on unmount or when previews change
  useEffect(() => {
    return () => {
      selectedImagePreviews.forEach(preview => URL.revokeObjectURL(preview.preview));
    };
  }, [selectedImagePreviews]);

  // Load analysis and images when trade is expanded or images tab is selected
  useEffect(() => {
    if (expandedTradeId) {
      loadTradeAnalysis(expandedTradeId);
      if (detailTab === "images") {
        loadTradeImages(expandedTradeId);
      }
    } else {
      // Clear images when no trade is selected
      setUploadedImages([]);
      setSelectedImagePreviews([]);
    }
  }, [expandedTradeId, detailTab, loadTradeAnalysis, loadTradeImages]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const eventName = 'trading-journal:settings-change';
    const handleSettingsEvent = (event: Event) => {
      const customEvent = event as CustomEvent<JournalSettingsEventDetail>;
      const detail = customEvent.detail;
      if (!detail) {
        return;
      }

      if (wgid && detail.widgetId && detail.widgetId !== wgid) {
        return;
      }

      if (detail.action === 'delete') {
        loadJournalTitles();
        return;
      }

      if (detail.action === 'create') {
        loadJournalTitles(detail.journalId || undefined);
        return;
      }

      if (detail.journalId) {
        setSelectedJournalTitle(detail.journalId);
      }
    };

    window.addEventListener(eventName, handleSettingsEvent as EventListener);
    return () => {
      window.removeEventListener(eventName, handleSettingsEvent as EventListener);
    };
  }, [wgid, loadJournalTitles, selectedJournalTitle]);

  const toggleNoteSection = (section: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedNotes(newExpanded);
  };

  // Fetch historical price data for trade chart
  const fetchTradeChartData = useCallback(async (trade: Trade) => {
    if (!trade || !trade.pair || trade.pair === 'N/A' || loadingChartData[trade.id]) {
      // If no valid pair, set empty data immediately
      if (!trade?.pair || trade.pair === 'N/A') {
        setTradeChartData(prev => ({ ...prev, [trade.id]: [] }));
      }
      return;
    }

    setLoadingChartData(prev => ({ ...prev, [trade.id]: true }));

    try {
      // Detect if this is a single currency (3 characters) vs currency pair (6+ characters)
      // Single currencies: "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"
      // Currency pairs: "EURUSD", "GBPUSD", "USDJPY", etc.
      const isSingleCurrency = trade.pair.length === 3;
      
      // Determine date range based on trade status
      // Parse trade date - handle different formats
      let tradeDate: Date;
      if (trade.date) {
        // Try parsing as ISO string first (YYYY-MM-DD)
        if (typeof trade.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(trade.date)) {
          tradeDate = new Date(trade.date + 'T00:00:00Z');
        } else {
          tradeDate = new Date(trade.date);
        }
        // If date is invalid, use current date as fallback
        if (isNaN(tradeDate.getTime())) {
          console.warn(`Invalid trade date: ${trade.date}, using current date`);
          tradeDate = new Date();
        }
      } else {
        console.warn('No trade date available, using current date');
        tradeDate = new Date();
      }

      let fromTimestamp: number;
      let toTimestamp: number;

      // Limit data range for performance
      // Single currencies: Use 7 days (API returns too much data for longer ranges)
      // Currency pairs: Use 30 days (API respects date range better)
      const now = Date.now();
      const daysToRequest = isSingleCurrency ? 7 : 30; // Shorter range for single currencies
      const rangeMs = daysToRequest * 24 * 60 * 60 * 1000;
      
      // Always use last N days from now for consistency and performance
      const endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      
      const startDate = new Date(now - rangeMs);
      startDate.setHours(0, 0, 0, 0);
      
      fromTimestamp = Math.floor(startDate.getTime() / 1000);
      toTimestamp = Math.floor(endDate.getTime() / 1000);
      
      // Final check: ensure we don't go into the future
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (toTimestamp > nowSeconds) {
        toTimestamp = nowSeconds;
      }

      // Validate timestamps
      if (isNaN(fromTimestamp) || isNaN(toTimestamp) || fromTimestamp <= 0 || toTimestamp <= 0) {
        console.error('Invalid timestamps calculated:', { 
          fromTimestamp, 
          toTimestamp, 
          tradeDate: trade.date,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
        throw new Error('Failed to calculate valid date range for chart');
      }

      // Ensure fromTimestamp is before toTimestamp
      if (fromTimestamp >= toTimestamp) {
        console.warn('fromTimestamp >= toTimestamp, adjusting...', { fromTimestamp, toTimestamp });
        // If from is after to, swap them or adjust
        toTimestamp = fromTimestamp + (7 * 24 * 60 * 60); // Add 7 days
      }

      // Determine timeframe based on trade duration
      // API format: "60" (1 hour), "240" (4 hour), "1D" (daily)
      // Single currencies: Use daily resolution only (API returns too much data with 4h)
      // Currency pairs: Use appropriate resolution based on range
      const durationDays = (toTimestamp - fromTimestamp) / (24 * 60 * 60);
      let resolutions: string[]; // Try multiple resolutions, prioritizing faster/more reliable ones
      
      if (isSingleCurrency) {
        // For single currencies, use daily resolution only (fewer data points, faster)
        // API seems to return excessive data with 4h resolution
        resolutions = ["1D"]; // Daily only for single currencies
      } else if (durationDays <= 7) {
        // For currency pairs with short ranges (≤7 days), try 4h first
        resolutions = ["240", "1D"]; // 4h first, then daily as fallback
      } else {
        // For currency pairs with longer ranges (7-30 days), prefer daily first (less data)
        resolutions = ["1D", "240"]; // Daily first (less data), then 4h as fallback
      }

      const startTime = performance.now();
      console.log('Fetching chart data:', {
        pair: trade.pair,
        isSingleCurrency,
        resolutions,
        fromTimestamp,
        toTimestamp,
        fromDate: new Date(fromTimestamp * 1000).toISOString(),
        toDate: new Date(toTimestamp * 1000).toISOString(),
        durationDays: durationDays.toFixed(1)
      });

      // Try multiple resolutions until we get data
      let rawCandleData: any[] = [];
      let successfulResolution = '';
      
      for (const resolution of resolutions) {
        try {
          const apiStartTime = performance.now();
          const response = await fetch('/api/pmt/getIQFeedHistoricalData', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              sym: trade.pair,
              res: resolution,
              frm: fromTimestamp.toString(),
              to: toTimestamp.toString(),
            }),
          });
          const apiEndTime = performance.now();
          const apiDuration = apiEndTime - apiStartTime;

          if (!response.ok) {
            console.warn(`Failed to fetch with resolution ${resolution} (${apiDuration.toFixed(0)}ms): ${response.statusText}`);
            continue; // Try next resolution
          }

          const parseStartTime = performance.now();
          const result = await response.json();
          const parseEndTime = performance.now();
          const parseDuration = parseEndTime - parseStartTime;
          
          const data = Array.isArray(result) ? result : (result?.data || []);
          
          if (data && data.length > 0) {
            rawCandleData = data;
            successfulResolution = resolution;
            console.log(`✅ Successfully fetched ${data.length} candles with resolution ${resolution} | API: ${apiDuration.toFixed(0)}ms | Parse: ${parseDuration.toFixed(0)}ms`);
            break; // Found data, stop trying other resolutions
          } else {
            console.log(`⚠️ Empty data for resolution ${resolution} (${apiDuration.toFixed(0)}ms + ${parseDuration.toFixed(0)}ms)`);
          }
        } catch (error) {
          console.warn(`Error fetching with resolution ${resolution}:`, error);
          continue; // Try next resolution
        }
      }

      if (rawCandleData.length === 0) {
        console.warn(`No data found for ${trade.pair} with any resolution. Tried: ${resolutions.join(', ')}`);
        // Mark as fetched even if no data, to prevent infinite loop
        setFetchedChartData(prev => new Set(prev).add(trade.id));
        setTradeChartData(prev => ({ ...prev, [trade.id]: [] }));
        return;
      }

      // Transform to chart format: { date: string, price: number }
      // Filter data to only include dates within our requested range
      const fromDate = new Date(fromTimestamp * 1000);
      const toDate = new Date(toTimestamp * 1000);
      const fromTime = fromDate.getTime();
      const toTime = toDate.getTime();
      
      const processStartTime = performance.now();
      
      // Early filter: If API returned too much data, pre-filter before expensive map operation
      // This is especially important for single currencies where API might return excessive data
      let dataToProcess = rawCandleData;
      if (rawCandleData.length > 1000) {
        // Quick pre-filter: Try to eliminate obviously out-of-range data
        // Parse datetime from first few fields to check approximate date range
        const preFiltered = rawCandleData.filter((candle: any) => {
          const datetimeStr = candle.datetime || candle.time || candle.Datetime || candle.timestamp || candle.date;
          if (!datetimeStr) return true; // Keep if no date, let full processing handle it
          
          let date: Date | null = null;
          if (typeof datetimeStr === 'number') {
            date = datetimeStr > 1000000000000 ? new Date(datetimeStr) : new Date(datetimeStr * 1000);
          } else if (typeof datetimeStr === 'string') {
            date = new Date(datetimeStr);
            if (isNaN(date.getTime())) {
              const ts = parseInt(datetimeStr);
              if (!isNaN(ts)) date = new Date(ts * 1000);
            }
          }
          
          if (!date || isNaN(date.getTime())) return true; // Keep for full processing
          const dateTime = date.getTime();
          
          // Quick check: if date is way outside range (more than 2x the range), skip it
          const rangeMs = toTime - fromTime;
          const buffer = rangeMs * 2; // Allow 2x buffer for safety
          return dateTime >= (fromTime - buffer) && dateTime <= (toTime + buffer);
        });
        
        console.log(`🔍 Pre-filtered ${rawCandleData.length} → ${preFiltered.length} candles (removed ${rawCandleData.length - preFiltered.length} out-of-range)`);
        dataToProcess = preFiltered;
      }
      
      // Single-pass transform and filter - more efficient
      const chartData = dataToProcess
        .map((candle: any, index: number) => {
          const closePrice = parseFloat(String(candle.close || candle.Close || candle.closePrice || '0'));
          if (!closePrice || closePrice <= 0) return null;

          // Parse datetime - handle multiple formats
          let date: Date | null = null;
          
          // Try different datetime field names and formats
          const datetimeStr = candle.datetime || candle.time || candle.Datetime || candle.timestamp || candle.date;
          
          if (datetimeStr) {
            if (typeof datetimeStr === 'string') {
              date = new Date(datetimeStr);
              if (isNaN(date.getTime())) {
                // Try parsing as Unix timestamp (seconds)
                const timestamp = parseInt(datetimeStr);
                if (!isNaN(timestamp)) {
                  date = new Date(timestamp * 1000);
                }
              }
            } else if (typeof datetimeStr === 'number') {
              // Unix timestamp (seconds or milliseconds)
              date = datetimeStr > 1000000000000 
                ? new Date(datetimeStr) // Milliseconds
                : new Date(datetimeStr * 1000); // Seconds
            }
          }

          // Fallback: calculate date from index and resolution
          if (!date || isNaN(date.getTime())) {
            const resolutionMap: Record<string, number> = {
              '60': 3600,    // 1 hour
              '240': 14400,  // 4 hour
              '1D': 86400,   // Daily
              '1h': 3600,    // Legacy format
              '4h': 14400,   // Legacy format
              '1d': 86400,   // Legacy format
            };
            const intervalSeconds = resolutionMap[successfulResolution] || resolutionMap['240'] || 14400; // Default 4h
            const baseTime = fromTimestamp * 1000;
            date = new Date(baseTime + (index * intervalSeconds * 1000));
          }

          if (isNaN(date.getTime())) {
            return null;
          }

          const dateTime = date.getTime();
          
          // Single filter: check all conditions at once (within requested date range)
          if (dateTime < fromTime || dateTime > toTime) {
            return null; // Skip dates outside our range
          }

          // Format date as "DD MMM" (e.g., "14 Jul")
          const day = date.getDate();
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const month = monthNames[date.getMonth()];
          
          return {
            date: `${day} ${month}`,
            price: closePrice,
            timestamp: dateTime,
          };
        })
        .filter((item): item is { date: string; price: number; timestamp: number } => item !== null)
        .sort((a, b) => a.timestamp - b.timestamp);
      
      const processEndTime = performance.now();
      const processDuration = processEndTime - processStartTime;
      
      const totalTime = processEndTime - startTime;
      console.log(`📊 Processed ${chartData.length} data points in ${processDuration.toFixed(0)}ms | Total: ${totalTime.toFixed(0)}ms`, {
        rawCount: rawCandleData.length,
        finalCount: chartData.length,
        dateRange: chartData.length > 0 ? {
          first: chartData[0].date,
          last: chartData[chartData.length - 1].date
        } : 'no data'
      });
      
      const finalChartData = chartData.map(({ timestamp, ...rest }) => rest); // Remove timestamp after sorting

      setTradeChartData(prev => ({ ...prev, [trade.id]: finalChartData }));
      // Mark as fetched successfully
      setFetchedChartData(prev => new Set(prev).add(trade.id));
    } catch (error) {
      console.error('Error fetching trade chart data:', error);
      // Mark as fetched even on error to prevent infinite retry loop
      setFetchedChartData(prev => new Set(prev).add(trade.id));
      // Keep empty array on error
      setTradeChartData(prev => ({ ...prev, [trade.id]: [] }));
    } finally {
      setLoadingChartData(prev => ({ ...prev, [trade.id]: false }));
    }
  }, [loadingChartData]);

  // Fetch chart data when trade is selected and charts tab is active
  useEffect(() => {
    if (expandedTradeId && detailTab === "charts") {
      const trade = trades.find(t => t.id === expandedTradeId);
      if (trade && trade.pair && trade.pair !== 'N/A') {
        const hasData = tradeChartData[trade.id] && Array.isArray(tradeChartData[trade.id]) && tradeChartData[trade.id].length > 0;
        const isLoading = loadingChartData[trade.id];
        const alreadyFetched = fetchedChartData.has(trade.id);
        
        // Only fetch if:
        // 1. We haven't fetched for this trade yet (even if empty, we've attempted)
        // 2. Not currently loading
        if (!alreadyFetched && !isLoading) {
          fetchTradeChartData(trade);
        }
      }
    }
  }, [expandedTradeId, detailTab, trades, fetchedChartData, loadingChartData, fetchTradeChartData]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!expandedTradeId) {
      setError('Please select a trade first');
      return;
    }
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;
    
    const journalID = getJournalID();
    if (!journalID) {
      setError('JournalID is required');
      return;
    }
    
    // Create previews for dropped files - show immediately
    const previews = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    console.log('📸 Setting previews (drop):', previews.length);
    setSelectedImagePreviews(previews);
    
    // Force a re-render to show previews before upload starts
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      setIsSaving(true);
      const uploadedImagePaths: string[] = [];
      for (const file of files) {
        const result = await saveJournalImage(journalID, expandedTradeId, file);
        console.log('✅ Image uploaded successfully:', result);
        if (result.imagePath) {
          // Construct full URL from imagePath and add to uploaded images immediately
          const fullUrl = getImageUrl(result.imagePath);
          uploadedImagePaths.push(fullUrl);
        }
      }
      // Clear previews after successful upload
      previews.forEach(preview => URL.revokeObjectURL(preview.preview));
      setSelectedImagePreviews([]);
      // Add newly uploaded images to the list immediately
      if (uploadedImagePaths.length > 0) {
        setUploadedImages(prev => [...uploadedImagePaths, ...prev]);
      }
      // Reload images after upload to ensure consistency
      await loadTradeImages(expandedTradeId);
    } catch (err) {
      console.error('Error uploading images:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload images');
      // Keep previews on error so user can retry
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    if (!expandedTradeId) {
      setError('Please select a trade first');
      return;
    }
    
    const journalID = getJournalID();
    if (!journalID) {
      setError('JournalID is required');
      return;
    }
    
    // Create previews for selected files - show immediately
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;
    
    const previews = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setSelectedImagePreviews(previews);
    
    // Small delay to ensure previews render before upload starts
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      setIsSaving(true);
      const uploadedImagePaths: string[] = [];
      for (const file of files) {
        const result = await saveJournalImage(journalID, expandedTradeId, file);
        console.log('✅ Image uploaded successfully:', result);
        if (result.imagePath) {
          // Construct full URL from imagePath and add to uploaded images immediately
          const fullUrl = getImageUrl(result.imagePath);
          uploadedImagePaths.push(fullUrl);
        }
      }
      // Clear previews after successful upload
      previews.forEach(preview => URL.revokeObjectURL(preview.preview));
      setSelectedImagePreviews([]);
      // Add newly uploaded images to the list immediately
      if (uploadedImagePaths.length > 0) {
        setUploadedImages(prev => [...uploadedImagePaths, ...prev]);
      }
      // Reload images after upload to ensure consistency
      await loadTradeImages(expandedTradeId);
    } catch (err) {
      console.error('Error uploading images:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload images');
      // Keep previews on error so user can retry
    } finally {
      setIsSaving(false);
    }
    
    // Reset input
    e.target.value = '';
  };

  // Delete a trade
  const handleDeleteTrade = async (rowId: number) => {
    const journalID = getJournalID();
    if (!journalID || !rowId) {
      setError('JournalID and RowID are required');
      return;
    }
    
    setShowDeleteConfirm(rowId);
  };

  const confirmDeleteTrade = async () => {
    if (!showDeleteConfirm) return;
    
    const rowId = showDeleteConfirm;
    setShowDeleteConfirm(null);
    
    const journalID = getJournalID();
    if (!journalID || !rowId) {
      setError('JournalID and RowID are required');
      return;
    }
    
    try {
      setIsSaving(true);
      // Use rowId as TradeID for the delete API call
      await deleteJournalRow(rowId, journalID);
      // Reload journal data
      await loadJournalData();
      // Find the trade by rowId to close expanded view if needed
      const tradeToClose = trades.find(t => t.rowId === rowId);
      if (tradeToClose && expandedTradeId === tradeToClose.id) {
        setExpandedTradeId(null);
      }
    } catch (err) {
      console.error('Error deleting trade:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete trade');
    } finally {
      setIsSaving(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  // Calculate stats from actual trades
  const winLossData = (() => {
    const wins = trades.filter(t => t.winLoss === "Win").length;
    const losses = trades.filter(t => t.winLoss === "Loss").length;
    return [
      { name: "Wins", value: wins, color: "#22c55e" },
      { name: "Losses", value: losses, color: "#ef4444" },
    ];
  })();

  const equityCurveData = trades.reduce((acc, trade, index) => {
    // Use equityAfter if available, otherwise calculate from equityBefore + gain
    // Ensure values are reasonable (not corrupted or extremely large)
    let equity: number;
    if (trade.equityAfter !== undefined && trade.equityAfter !== null && trade.equityAfter > 0) {
      equity = trade.equityAfter;
    } else {
      const equityBefore = Number(trade.equityBefore) || 100000;
      const gain = Number(trade.gain) || 0;
      equity = equityBefore + gain;
    }
    
    // Validate: clamp to reasonable range (0 to 1 billion)
    equity = Math.max(0, Math.min(equity, 1000000000));
    
    acc.push({
      trade: `Trade ${index + 1}`,
      equity: equity,
    });
    return acc;
  }, [] as Array<{ trade: string; equity: number }>);

  const cumulativeProfitData = trades.reduce((acc, trade, index) => {
    const prevProfit = acc.length > 0 ? acc[acc.length - 1].profit : 0;
    const gain = Number(trade.gain) || 0;
    // Validate: clamp to reasonable range (-1 billion to 1 billion)
    const profit = Math.max(-1000000000, Math.min(prevProfit + gain, 1000000000));
    acc.push({
      trade: `Trade ${index + 1}`,
      profit: profit,
    });
    return acc;
  }, [] as Array<{ trade: string; profit: number }>);

  // Calculate stats metrics
  const statsMetrics = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get initial equity (from first trade or default) - validate it's reasonable
    const initialEquityRaw = trades.length > 0 ? (Number(trades[0].equityBefore) || 100000) : 100000;
    const initialEquity = isFinite(initialEquityRaw) && initialEquityRaw > 0 && initialEquityRaw <= 1000000000 
      ? initialEquityRaw 
      : 100000;

    // Calculate total profit/loss from all trades - validate each gain value
    const totalProfit = trades.reduce((sum, trade) => {
      const gain = Number(trade.gain) || 0;
      const validGain = isFinite(gain) && Math.abs(gain) <= 1000000000 ? gain : 0;
      return sum + validGain;
    }, 0);
    
    // Calculate total return percentage: (total profit / initial equity) * 100
    // Clamp to reasonable range
    const totalReturnRaw = initialEquity > 0 ? (totalProfit / initialEquity) * 100 : 0;
    const totalReturn = isFinite(totalReturnRaw) ? Math.max(-1000, Math.min(totalReturnRaw, 1000)) : 0;

    // Filter trades for current month
    const currentMonthTrades = trades.filter(trade => {
      try {
        const tradeDate = new Date(trade.date);
        return tradeDate.getMonth() === currentMonth && tradeDate.getFullYear() === currentYear;
      } catch {
        return false;
      }
    });

    // Calculate profit for current month - validate each gain value
    const monthProfit = currentMonthTrades.reduce((sum, trade) => {
      const gain = Number(trade.gain) || 0;
      const validGain = isFinite(gain) && Math.abs(gain) <= 1000000000 ? gain : 0;
      return sum + validGain;
    }, 0);
    
    // Calculate equity before for current month (use first trade's equityBefore or sum of previous month)
    let monthEquityBefore = initialEquity;
    if (currentMonthTrades.length > 0) {
      const rawEquity = Number(currentMonthTrades[0].equityBefore) || initialEquity;
      monthEquityBefore = isFinite(rawEquity) && rawEquity > 0 && rawEquity <= 1000000000 ? rawEquity : initialEquity;
    } else {
      // Find last trade before current month to get ending equity
      const prevTrades = trades.filter(trade => {
        try {
          const tradeDate = new Date(trade.date);
          return tradeDate.getMonth() < currentMonth || tradeDate.getFullYear() < currentYear;
        } catch {
          return false;
        }
      });
      if (prevTrades.length > 0) {
        const rawEquity = Number(prevTrades[prevTrades.length - 1].equityAfter) || initialEquity;
        monthEquityBefore = isFinite(rawEquity) && rawEquity > 0 && rawEquity <= 1000000000 ? rawEquity : initialEquity;
      }
    }

    // Calculate return for current month - clamp to reasonable range
    const returnThisMonthRaw = monthEquityBefore > 0 ? (monthProfit / monthEquityBefore) * 100 : 0;
    const returnThisMonth = isFinite(returnThisMonthRaw) ? Math.max(-1000, Math.min(returnThisMonthRaw, 1000)) : 0;

    // Calculate total hitrate (win percentage)
    const totalWins = trades.filter(t => t.winLoss === "Win").length;
    const totalHitrate = trades.length > 0 ? (totalWins / trades.length) * 100 : 0;

    // Calculate hitrate for current month
    const monthWins = currentMonthTrades.filter(t => t.winLoss === "Win").length;
    const hitrateThisMonth = currentMonthTrades.length > 0 ? (monthWins / currentMonthTrades.length) * 100 : 0;

    return {
      totalReturn,
      returnThisMonth,
      totalHitrate,
      hitrateThisMonth,
    };
  }, [trades]);

  // Calculate total return by trade (cumulative return percentage)
  const totalReturnByTradeData = useMemo(() => {
    if (trades.length === 0) return [];
    
    const initialEquity = Number(trades[0].equityBefore) || 100000;
    let cumulativeProfit = 0;
    
    return trades.map((trade, index) => {
      const gain = Number(trade.gain) || 0;
      cumulativeProfit += gain;
      const returnPercent = initialEquity > 0 ? (cumulativeProfit / initialEquity) * 100 : 0;
      // Validate: clamp to reasonable range (-1000% to 1000%)
      const clampedReturn = Math.max(-1000, Math.min(returnPercent, 1000));
      return {
        trade: index + 1,
        return: clampedReturn,
      };
    });
  }, [trades]);

  // Calculate dynamic domains for charts with validation
  const equityCurveDomain = useMemo(() => {
    if (equityCurveData.length === 0) return [0, 100000];
    const values = equityCurveData.map(d => d.equity).filter(v => isFinite(v) && v >= 0 && v <= 1000000000);
    if (values.length === 0) return [0, 100000];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      // All values are the same, add padding around the single value
      const padding = Math.max(min * 0.05, 1000);
      return [Math.max(0, min - padding), max + padding];
    }
    const padding = (max - min) * 0.1; // 10% padding
    return [Math.max(0, min - padding), max + padding];
  }, [equityCurveData]);

  const cumulativeProfitDomain = useMemo(() => {
    if (cumulativeProfitData.length === 0) return [-1000, 1000];
    const values = cumulativeProfitData.map(d => d.profit).filter(v => isFinite(v) && Math.abs(v) <= 1000000000);
    if (values.length === 0) return [-1000, 1000];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      // All values are the same
      const padding = Math.max(Math.abs(min) * 0.05, 100);
      return [min - padding, max + padding];
    }
    const padding = Math.abs(max - min) * 0.1; // 10% padding
    return [min - padding, max + padding];
  }, [cumulativeProfitData]);

  const totalReturnDomain = useMemo(() => {
    if (totalReturnByTradeData.length === 0) return [-5, 5];
    const values = totalReturnByTradeData.map(d => d.return).filter(v => isFinite(v) && Math.abs(v) <= 1000);
    if (values.length === 0) return [-5, 5];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      // All values are the same
      const padding = Math.max(Math.abs(min) * 0.05, 1);
      return [min - padding, max + padding];
    }
    const padding = Math.abs(max - min) * 0.1; // 10% padding
    return [min - padding, max + padding];
  }, [totalReturnByTradeData]);

  // Calculate calendar trade data from actual trades - use full date (YYYY-MM-DD) as key
  const calendarTradeData = useMemo(() => {
    const data: Record<string, { 
      profit: number; 
      trades: number; 
      pips: number; 
      winRate: number;
      pairs: string[];
      percentGain: number;
      totalEquityBefore: number;
    }> = {};
    
  trades.forEach(trade => {
    try {
      const tradeDate = new Date(trade.date);
        // Use full date string (YYYY-MM-DD) as key to include year and month
        const dateKey = `${tradeDate.getFullYear()}-${String(tradeDate.getMonth() + 1).padStart(2, '0')}-${String(tradeDate.getDate()).padStart(2, '0')}`;
        if (!data[dateKey]) {
          data[dateKey] = { 
            profit: 0, 
            trades: 0, 
            pips: 0, 
            winRate: 0,
            pairs: [],
            percentGain: 0,
            totalEquityBefore: 0,
          };
        }
        data[dateKey].profit += trade.gain || 0;
        data[dateKey].trades += 1;
        
        // Use actual pips value from trade, or calculate from price difference if pips is 0
        let tradePips = trade.pips || 0;
        // If pips is 0 but we have valid open/close prices, calculate pips from price difference
        if (tradePips === 0 && trade.openPrice && trade.closePrice && trade.openPrice !== 0 && trade.closePrice !== 0) {
          // Calculate pips: for forex, 1 pip = 0.0001 (for most pairs)
          // Pips = (closePrice - openPrice) * 10000
          const priceDiff = trade.closePrice - trade.openPrice;
          tradePips = priceDiff * 10000;
        }
        data[dateKey].pips += tradePips;
        
        data[dateKey].totalEquityBefore += trade.equityBefore || 0;
        
        // Add unique pairs
        if (trade.pair && !data[dateKey].pairs.includes(trade.pair)) {
          data[dateKey].pairs.push(trade.pair);
        }
        
      if (trade.winLoss === "Win") {
          data[dateKey].winRate += 1;
      }
    } catch (e) {
      // Skip invalid dates
    }
  });
  
    // Calculate win rate percentages and average percentage gain
    Object.keys(data).forEach(dateKey => {
      const dayData = data[dateKey];
      dayData.winRate = dayData.trades > 0 ? (dayData.winRate / dayData.trades) * 100 : 0;
      // Calculate percentage gain: (total profit / total equity before) * 100
      dayData.percentGain = dayData.totalEquityBefore > 0 
        ? (dayData.profit / dayData.totalEquityBefore) * 100 
        : 0;
    });
    
    return data;
  }, [trades]);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const weeks = [];
    let days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      const prevMonthDays = getDaysInMonth(currentMonth - 1, currentYear);
      days.push({
        day: prevMonthDays - firstDay + i + 1,
        isCurrentMonth: false,
      });
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      // Use full date string (YYYY-MM-DD) to match trade data keys
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = calendarTradeData[dateKey];
      days.push({
        day,
        isCurrentMonth: true,
        hasTrade: !!dayData,
        tradeData: dayData,
      });

      if (days.length === 7) {
        weeks.push(days);
        days = [];
      }
    }

    // Fill remaining days
    if (days.length > 0) {
      const remaining = 7 - days.length;
      for (let i = 1; i <= remaining; i++) {
        days.push({
          day: i,
          isCurrentMonth: false,
        });
      }
      weeks.push(days);
    }

    return weeks;
  };

  // Calculate weekly breakdown for the current month
  const calculateWeeklyBreakdown = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const weeks: Array<Array<{ day: number; isCurrentMonth: boolean; tradeData?: { profit: number; trades: number } }>> = [];
    let days: Array<{ day: number; isCurrentMonth: boolean; tradeData?: { profit: number; trades: number } }> = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      const prevMonthDays = getDaysInMonth(currentMonth - 1, currentYear);
      days.push({
        day: prevMonthDays - firstDay + i + 1,
        isCurrentMonth: false,
      });
    }

    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = calendarTradeData[dateKey];
      days.push({
        day,
        isCurrentMonth: true,
        tradeData: dayData,
      });

      if (days.length === 7) {
        weeks.push(days);
        days = [];
      }
    }

    // Fill remaining days
    if (days.length > 0) {
      const remaining = 7 - days.length;
      for (let i = 1; i <= remaining; i++) {
        days.push({
          day: i,
          isCurrentMonth: false,
        });
      }
      weeks.push(days);
    }

    // Calculate weekly stats
    const weeklyStats: Array<{ week: number; total: number; days: number }> = [];

    weeks.forEach((weekDays, weekIndex) => {
      let weekTotal = 0;
      const daysWithTrades = new Set<number>();

      weekDays.forEach((dayObj) => {
        // Only count days that are in the current month
        if (dayObj.isCurrentMonth && dayObj.tradeData) {
          weekTotal += dayObj.tradeData.profit || 0;
          if (dayObj.tradeData.trades > 0) {
            daysWithTrades.add(dayObj.day);
          }
        }
      });

      weeklyStats.push({
        week: weekIndex + 1,
        total: weekTotal,
        days: daysWithTrades.size,
      });
    });

    return weeklyStats;
  }, [currentMonth, currentYear, calendarTradeData]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const navigateMonth = (direction: number) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Format amount: show as-is if < 10000, otherwise show in K format
  const formatAmount = (amount: number): string => {
    const absAmount = Math.abs(amount);
    const sign = amount >= 0 ? "" : "-";
    
    if (absAmount >= 10000) {
      return `${sign}$${(absAmount / 1000).toFixed(2)}K`;
    } else {
      return `${sign}$${absAmount.toFixed(2)}`;
    }
  };

  // Jump to current month
  const jumpToCurrentMonth = useCallback(() => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  }, []);

  // Calculate monthly stats for the currently displayed month
  const monthlyStats = useMemo(() => {
    let totalProfit = 0;
    let totalTrades = 0;
    const daysWithTrades = new Set<string>();

    // Filter trades for the current month and year
    trades.forEach(trade => {
      try {
        const tradeDate = new Date(trade.date);
        const tradeYear = tradeDate.getFullYear();
        const tradeMonth = tradeDate.getMonth();

        // Only count trades from the currently displayed month
        if (tradeYear === currentYear && tradeMonth === currentMonth) {
          totalProfit += trade.gain || 0;
          totalTrades += 1;
          daysWithTrades.add(tradeDate.toISOString().split('T')[0]);
        }
      } catch (e) {
        // Skip invalid dates
      }
    });

    return {
      totalProfit,
      totalTrades,
      daysWithTrades: daysWithTrades.size,
    };
  }, [trades, currentMonth, currentYear]);

  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden relative">
      <div className="px-4 py-2 bg-widget-header border-b border-border flex items-center justify-between flex-shrink-0 group">
        <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={onFullscreen}>
          <h3 className="text-foreground">
            Journal
            {selectedJournalName ? (
              <>
                <span className="text-muted-foreground"> | </span>
                <span className="text-primary">{selectedJournalName}</span>
              </>
            ) : (
              <span className="text-muted-foreground"> | Select a journal</span>
            )}
          </h3>
          {onFullscreen && (
            <div className="text-muted-foreground text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to expand
            </div>
          )}
          <div className="h-4 w-20 flex items-center justify-start">
            {isSaving && (
              <span className="text-primary flex items-center gap-1.5 text-base font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving...
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onSettings && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onSettings}
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-base font-medium text-destructive">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-base font-medium text-muted-foreground">Loading journal...</p>
          </div>
        </div>
      ) : (
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          {/* Main Tabs - Clean Boxed Style */}
          <div className="bg-widget-header border-b border-border flex items-center gap-2 px-3 py-2 flex-shrink-0">
            {[
              { value: "journal", label: "Journal" },
              { value: "calendar", label: "Calendar" },
              { value: "stats", label: "Stats" }
            ].map((tab) => {
              const isActive = activeTab === tab.value;
              
                return (
                <button
                  key={tab.value}
                  className={`
                    px-4 py-1.5 rounded border text-base font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-transparent border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }
                  `}
                  onClick={() => setActiveTab(tab.value as "journal" | "calendar" | "stats")}
                >
                  {tab.label}
                </button>
                );
              })}
        </div>

          {/* Journal Tab */}
          <TabsContent value="journal" className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden m-0 p-0 min-h-0">
            {isAddingTrade && (
              <div className="border border-gray-800 bg-[#1a0f05] px-5 py-5 shadow-[0_8px_22px_rgba(0,0,0,0.45)] rounded-none flex-shrink-0">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                      <h2 className="text-2xl font-semibold text-orange-500">
                        Add New Trade
                      </h2>
                    </div>
          <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handlePrefillTestTrade}
                        className="text-sm font-medium h-8 border border-gray-600 text-gray-200 hover:bg-gray-800 bg-transparent"
                      >
                        Prefill Test Data
            </Button>
            <Button
              size="sm"
              variant="ghost"
                        onClick={handleCancelAddTrade}
                        className="text-sm font-medium h-8 text-gray-300 hover:text-white bg-transparent"
            >
              Cancel
            </Button>
          <Button
            size="sm"
                        onClick={handleSubmitNewTrade}
                        className="text-sm h-8 bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center gap-1"
          >
                        <Plus className="w-3 h-3" />
                        Save Trade
          </Button>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    {/* Column 1 */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Symbol/Pair *</label>
            <Input
                        value={newTradeForm.pair}
                        onChange={(e) => handleNewTradeFieldChange("pair", e.target.value)}
                        placeholder="e.g. EURUSD, AAPL"
                        className="h-9 rounded-none text-sm border border-gray-900/50 text-gray-200 placeholder:text-gray-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Equity Before *</label>
                      <Input
                        type="number"
                        value={newTradeForm.equityBefore}
                        onChange={(e) => handleNewTradeFieldChange("equityBefore", e.target.value)}
                        placeholder="e.g. 10000"
                        className="h-9 rounded-none text-sm border border-gray-900/50 text-gray-200 placeholder:text-gray-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Open Price</label>
                      <Input
                        type="number"
                        value={newTradeForm.openPrice}
                        onChange={(e) => handleNewTradeFieldChange("openPrice", e.target.value)}
                        placeholder="e.g. 1.1000"
                        className="h-9 rounded-none text-sm border border-gray-900/50 text-gray-200 placeholder:text-gray-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Open Time</label>
                      <Popover>
                        <PopoverTrigger asChild>
            <Button
                            variant="outline"
                            className="h-9 rounded-none text-sm border border-gray-900/50 text-gray-200 bg-input-background dark:bg-input/30 justify-start text-left font-normal hover:bg-input-background/80 w-full"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            {newTradeForm.openTime || "Select time"}
            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3 bg-widget-body border-border" align="start">
                          <TimePicker
                            value={newTradeForm.openTime}
                            onChange={(time) => handleNewTradeFieldChange("openTime", time)}
                          />
                        </PopoverContent>
                      </Popover>
          </div>

                    {/* Column 2 */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Trade Date *</label>
                      <Popover>
                        <PopoverTrigger asChild>
          <Button
            variant="outline"
                            className="h-9 rounded-none text-sm border border-gray-900/50 text-gray-200 bg-input-background dark:bg-input/30 justify-start text-left font-normal hover:bg-input-background/80 w-full"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newTradeForm.date ? format(new Date(newTradeForm.date), "yyyy-MM-dd") : "Select date"}
          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-widget-body border-border" align="start">
                          <CustomDatePicker
                            value={newTradeForm.date}
                            onChange={(date) => handleNewTradeFieldChange("date", date)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Risk</label>
                      <Input
                        type="number"
                        value={newTradeForm.risk}
                        onChange={(e) => handleNewTradeFieldChange("risk", e.target.value)}
                        placeholder="e.g. 100"
                        className="h-9 rounded-none text-sm border border-gray-900/50 text-gray-200 placeholder:text-gray-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Close Price</label>
                      <Input
                        type="number"
                        value={newTradeForm.closePrice}
                        onChange={(e) => handleNewTradeFieldChange("closePrice", e.target.value)}
                        placeholder="e.g. 1.1050"
                        className="h-9 rounded-none text-sm border border-gray-900/50 text-gray-200 placeholder:text-gray-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Close Time</label>
                      <Popover>
                        <PopoverTrigger asChild>
        <Button
                            variant="outline"
                            className="h-9 rounded-none text-sm border border-gray-900/50 text-gray-200 bg-input-background dark:bg-input/30 justify-start text-left font-normal hover:bg-input-background/80 w-full"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            {newTradeForm.closeTime || "Select time"}
        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3 bg-widget-body border-border" align="start">
                          <TimePicker
                            value={newTradeForm.closeTime}
                            onChange={(time) => handleNewTradeFieldChange("closeTime", time)}
                          />
                        </PopoverContent>
                      </Popover>
      </div>

                    {/* Column 3 */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Direction</label>
                      <select
                        value={newTradeForm.direction}
                        onChange={(e) => handleNewTradeFieldChange("direction", e.target.value)}
                        className="h-9 rounded-none border border-gray-900/50 bg-input-background dark:bg-input/30 text-sm px-2 text-gray-200 [&>option]:bg-input-background [&>option]:dark:bg-input/30"
                      >
                        <option value="Long">Long</option>
                        <option value="Short">Short</option>
                      </select>
        </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Planned Reward</label>
                      <Input
                        type="number"
                        value={newTradeForm.plannedReward}
                        onChange={(e) => handleNewTradeFieldChange("plannedReward", e.target.value)}
                        placeholder="e.g. 300"
                        className="h-9 rounded-none text-sm border border-gray-900/50 text-gray-200 placeholder:text-gray-500"
                      />
        </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Stop Loss</label>
                      <Input
                        type="number"
                        value={newTradeForm.stopLoss}
                        onChange={(e) => handleNewTradeFieldChange("stopLoss", e.target.value)}
                        placeholder="e.g. 1.0950"
                        className="h-9 rounded-none text-sm border border-gray-900/50 text-gray-200 placeholder:text-gray-500"
                      />
          </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">P&L (Gain/Loss $)</label>
                      <Input
                        type="number"
                        value={newTradeForm.gain}
                        onChange={(e) => handleNewTradeFieldChange("gain", e.target.value)}
                        placeholder="e.g. 325 or -100"
                        className="h-9 rounded-none text-sm border border-gray-900/50 text-gray-200 placeholder:text-gray-500"
                      />
        </div>

                    {/* Column 4 */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Status</label>
                      <select
                        value={newTradeForm.status}
                        onChange={(e) => handleNewTradeFieldChange("status", e.target.value)}
                        className="h-9 rounded-none border border-gray-900/50 bg-input-background dark:bg-input/30 text-sm px-2 text-gray-200 [&>option]:bg-input-background [&>option]:dark:bg-input/30"
                      >
                        <option value="Open">Open</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Trade Style</label>
                      <select
                        value={newTradeForm.tradeStyle}
                        onChange={(e) => handleNewTradeFieldChange("tradeStyle", e.target.value)}
                        className="h-9 rounded-none border border-gray-900/50 bg-input-background dark:bg-input/30 text-sm px-2 text-gray-200 [&>option]:bg-input-background [&>option]:dark:bg-input/30"
                      >
                        <option value="Discretionary">Discretionary</option>
                        <option value="Swing Trading">Swing Trading</option>
                        <option value="Breakout">Breakout</option>
                        <option value="Event Trading">Event Trading</option>
                        <option value="Scalping">Scalping</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Take Profit</label>
                      <Input
                        type="number"
                        value={newTradeForm.takeProfit}
                        onChange={(e) => handleNewTradeFieldChange("takeProfit", e.target.value)}
                        placeholder="e.g. 1.1100"
                        className="h-9 rounded-none text-sm border border-gray-900/50 text-gray-200 placeholder:text-gray-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-orange-300">Win/Loss</label>
                      <select
                        value={newTradeForm.winLoss}
                        onChange={(e) => handleNewTradeFieldChange("winLoss", e.target.value)}
                        className="h-9 rounded-none border border-gray-900/50 bg-input-background dark:bg-input/30 text-sm px-2 text-gray-200 [&>option]:bg-input-background [&>option]:dark:bg-input/30"
                      >
                        <option value="-">-</option>
                        <option value="Win">Win</option>
                        <option value="Loss">Loss</option>
                      </select>
          </div>

                    {/* Notes at the bottom spanning full width */}
                    <div className="flex flex-col gap-1 md:col-span-4">
                      <label className="text-sm font-medium text-orange-300">Notes</label>
                      <textarea
                        value={newTradeForm.notes}
                        onChange={(e) => handleNewTradeFieldChange("notes", e.target.value)}
                        placeholder="Trade notes, strategy rationale, etc."
                        className="min-h-[72px] rounded-none border border-gray-900/50 bg-input-background dark:bg-input/30 text-sm px-3 py-2 text-gray-200 placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
              {/* Trades Table */}
            <div className="w-full">
                {/* Table Header */}
                <div className="grid grid-cols-[40px_60px_80px_100px_80px_60px_80px_80px_80px_80px_120px_80px] gap-4 px-4 py-4 bg-widget-header border-b border-border text-base font-medium text-muted-foreground sticky top-0 z-10">
                  <div></div>
                  <div>TradeID</div>
                  <div>Pair</div>
                  <div>Date</div>
                  <div>Direction</div>
                  <div>Risk</div>
                  <div>Status</div>
                  <div>Win/Loss</div>
                  <div>%Gain</div>
                  <div>Gain $</div>
                  <div>Trade Style</div>
                  <div className="flex items-center justify-end">
                    <button
                      className="flex items-center gap-2 text-base font-medium text-orange-500 hover:text-orange-400 transition-colors ml-auto whitespace-nowrap"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddTrade();
                      }}
                    >
                      <span className="text-muted-foreground/60">|</span>
                      <Plus className="w-4 h-4 text-orange-500" />
                      <span className="whitespace-nowrap">Add Trade</span>
                    </button>
                  </div>
                </div>

                {/* Table Rows */}
                {trades.length === 0 && !isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="text-xl mb-2">No trades found</p>
                    <p className="text-base font-medium">Add a new trade to get started</p>
                  </div>
                ) : (
                  trades.map((trade) => {
                  const isExpanded = expandedTradeId === trade.id;
                  const selectedTrade = isExpanded ? trade : null;
                  const analysisEntry = tradeAnalysis[trade.id] ?? ({} as Partial<JournalAnalysis>);
                  
                  return (
                    <div key={trade.id} className="border-b border-border/50">
                      {/* Trade Row */}
                      <div
                        className={`grid grid-cols-[40px_60px_80px_100px_80px_60px_80px_80px_80px_80px_120px_80px] gap-4 px-4 py-2 cursor-pointer hover:bg-widget-header/30 transition-colors text-base font-medium ${
                          isExpanded ? "bg-widget-header/50" : ""
                        }`}
                        onClick={() => setExpandedTradeId(isExpanded ? null : trade.id)}
                      >
                        <div className="flex items-center justify-center">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>{trade.id}</div>
                        <div>{trade.pair}</div>
                        <div>{trade.date}</div>
                        <div className={`flex items-center gap-1 ${
                          trade.direction === "Long" ? "text-green-500" : "text-red-500"
                        }`}>
                          {trade.direction === "Long" ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>{trade.direction}</span>
                        </div>
                        <div>{trade.risk}</div>
                        <div>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-normal ${
                            trade.status === "Closed" ? "bg-slate-500/20 text-slate-400" : "bg-blue-500/20 text-blue-400"
                          }`}>
                            {trade.status}
                          </span>
                        </div>
                        <div>
                          <span className={`${
                            trade.winLoss === "Win" ? "text-green-500" : trade.winLoss === "Loss" ? "text-red-500" : ""
                          }`}>
                            {trade.winLoss}
                          </span>
                        </div>
                        <div>
                          {(() => {
                            const percent = ((trade.equityAfter - trade.equityBefore) / trade.equityBefore) * 100;
                            return percent > 0 ? `+${percent.toFixed(1)}%` : `${percent.toFixed(1)}%`;
                          })()}
                        </div>
                        <div className={`${
                          trade.gain > 0 ? "text-green-500" : trade.gain < 0 ? "text-red-500" : ""
                        }`}>
                          {trade.gain > 0 ? "+" : ""}{trade.gain.toLocaleString('en-US')}$
                        </div>
                        <div>{trade.tradeStyle}</div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="p-1 hover:bg-widget-header rounded"
                            onClick={() => handleDeleteTrade(trade.rowId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Trade Details */}
                      {isExpanded && selectedTrade && (
                        <div className="bg-background/30 border-2 border-muted-foreground/30 m-2 rounded p-2">
                          {/* Detail Tabs - Safari Style */}
                          <div className="bg-widget-header border-b border-border flex items-center gap-2 px-3 py-2">
                            {["charts", "notes", "images"].map((tab) => {
                              const isActive = detailTab === tab;
                              const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
                              
                              return (
                                <button
                                  key={tab}
                                  className={`
                                    px-4 py-1.5 rounded border text-base font-medium transition-all duration-200
                                    ${isActive 
                                      ? 'bg-primary/10 border-primary text-primary' 
                                      : 'bg-transparent border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                                    }
                                  `}
                                  onClick={() => setDetailTab(tab as "charts" | "notes" | "images")}
                                >
                                  {tabLabel}
                                </button>
                              );
                            })}
                          </div>

                          {/* Detail Content */}
                          <div className="flex h-[500px]">
                            {detailTab === "charts" && (
                              <>
                                {/* Chart */}
                                <div className="flex-1 p-4 flex flex-col">
                                  {/* Chart Header */}
                                  <div className="mb-2 flex items-center justify-between">
                                    <div className="text-base font-semibold">
                                      {selectedTrade.pair} - {new Date(selectedTrade.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    {loadingChartData[selectedTrade.id] && (
                                      <div className="text-xs text-muted-foreground">Loading...</div>
                                    )}
                                  </div>
                                  
                                  <div className="flex-1 bg-black/40 border border-border/60 rounded p-2 shadow-inner" style={{ boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.6)' }}>
                                    {loadingChartData[selectedTrade.id] ? (
                                      <div className="flex items-center justify-center h-full">
                                        <div className="text-muted-foreground">Loading chart data...</div>
                                      </div>
                                    ) : (tradeChartData[selectedTrade.id] && tradeChartData[selectedTrade.id].length > 0) ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart 
                                          key={`chart-${selectedTrade.id}`}
                                          data={tradeChartData[selectedTrade.id]}
                                        >
                                        <defs>
                                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                          </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                                        <XAxis 
                                          dataKey="date" 
                                          stroke="rgba(148, 163, 184, 0.5)"
                                          style={{ fontSize: '13px' }}
                                        />
                                        <YAxis 
                                          stroke="rgba(148, 163, 184, 0.5)"
                                          style={{ fontSize: '13px' }}
                                          domain={['dataMin - 0.01', 'dataMax + 0.01']}
                                        />
                                        <Tooltip 
                                          contentStyle={{ 
                                            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                                            border: '1px solid rgba(100, 116, 139, 0.5)',
                                            borderRadius: '4px',
                                            fontSize: '14px'
                                          }}
                                        />
                                        <Area 
                                          type="monotone" 
                                          dataKey="price" 
                                          stroke="#22c55e" 
                                          strokeWidth={2}
                                          fill="url(#colorPrice)" 
                                        />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center h-full">
                                        <div className="text-muted-foreground mb-1">No chart data available</div>
                                        {(!selectedTrade.pair || selectedTrade.pair === 'N/A') && (
                                          <div className="text-xs text-muted-foreground/70">Trade pair is required to load chart data</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Trade Details Panel */}
                                <div className="w-[300px] p-4 border-l border-border overflow-auto">
                                  <div className="text-lg font-semibold mb-3">Trade Details</div>
                                  
                                  <div className="space-y-2.5">
                                    <div className="flex justify-between text-base font-medium">
                                      <span className="text-muted-foreground">Direction Correct/Wrong:</span>
                                      <span className="text-green-500">Correct</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium">
                                      <span className="text-muted-foreground">Open Price:</span>
                                      <span>{selectedTrade.openPrice}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium">
                                      <span className="text-muted-foreground">Close Price:</span>
                                      <span>{selectedTrade.closePrice || "-"}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium">
                                      <span className="text-muted-foreground">Planned Reward:</span>
                                      <span className="text-primary">${selectedTrade.plannedReward.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium">
                                      <span className="text-muted-foreground">Pnl. No Intervention:</span>
                                      <span className="text-primary">$0.00</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium">
                                      <span className="text-muted-foreground">Equity(Before):</span>
                                      <span>${selectedTrade.equityBefore.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium">
                                      <span className="text-muted-foreground">Equity(After):</span>
                                      <span>${selectedTrade.equityAfter.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium">
                                      <span className="text-muted-foreground">Pips:</span>
                                      <span>{selectedTrade.pips.toFixed(1)} pips</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium">
                                      <span className="text-muted-foreground">MFE Pips:</span>
                                      <span>-</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium">
                                      <span className="text-muted-foreground">MAE Pips:</span>
                                      <span>-</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium">
                                      <span className="text-muted-foreground">MAE %:</span>
                                      <span>-</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium">
                                      <span className="text-muted-foreground">Quarter:</span>
                                      <span>{selectedTrade.quarter}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-medium">
                                      <span className="text-muted-foreground">Year:</span>
                                      <span>{selectedTrade.year}</span>
                                    </div>

                                    <div className="border-t border-border pt-2 mt-2">
                                      <div className="flex justify-between text-base font-medium">
                                        <span className="text-muted-foreground">Stop Loss:</span>
                                        <span>{selectedTrade.stopLoss}</span>
                                      </div>
                                      <div className="flex justify-between text-base font-medium">
                                        <span className="text-muted-foreground">Take Profit:</span>
                                        <span>{selectedTrade.takeProfit}</span>
                                      </div>
                                      <div className="flex justify-between text-base font-medium">
                                        <span className="text-muted-foreground">Open Time:</span>
                                        <span>-</span>
                                      </div>
                                      <div className="flex justify-between text-base font-medium">
                                        <span className="text-muted-foreground">Close Time:</span>
                                        <span>-</span>
                                      </div>
                                      <div className="flex justify-between text-base font-medium">
                                        <span className="text-muted-foreground">Duration:</span>
                                        <span>-</span>
                                      </div>
                                      <div className="flex justify-between text-base font-medium">
                                        <span className="text-muted-foreground">ATR %:</span>
                                        <span>-</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}

                            {detailTab === "notes" && (
                              <div className="flex-1 p-4 flex flex-col gap-3 overflow-auto">
                                {/* Pre-Trade Analysis */}
                                <div className="bg-widget-header/50 border border-border rounded overflow-hidden">
                                  <div className="flex items-center justify-between px-3 py-2.5 hover:bg-widget-header transition-colors">
                                  <button
                                    onClick={() => toggleNoteSection("analysis")}
                                      className="flex items-center gap-2 flex-1 text-left"
                                  >
                                      <div className="w-1 h-4 bg-blue-500 rounded-full" />
                                      <span className="text-base font-medium">Pre-Trade Analysis</span>
                                    </button>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSaveAnalysis(selectedTrade.id, {
                                            JournalID: getJournalID() ?? 0,
                                            TradeID: selectedTrade.id,
                                            Analysis: analysisEntry.Analysis,
                                            Risk: analysisEntry.Risk,
                                            PostAnalysis: analysisEntry.PostAnalysis,
                                          });
                                        }}
                                        disabled={isSaving}
                                        className="h-7 text-xs bg-transparent border border-border text-muted-foreground hover:bg-muted/20 px-4 mr-1"
                                      >
                                        {isSaving ? (
                                          <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Saving...
                                          </>
                                        ) : (
                                          <>
                                            <Save className="w-3 h-3 mr-1.5" />
                                            Save
                                          </>
                                        )}
                                      </Button>
                                      <button
                                        onClick={() => toggleNoteSection("analysis")}
                                      >
                                    <ChevronDown 
                                      className={`w-4 h-4 transition-transform ${
                                        expandedNotes.has("analysis") ? "rotate-180" : ""
                                      }`}
                                    />
                                  </button>
                                    </div>
                                  </div>
                                  {expandedNotes.has("analysis") && (
                                    <div className="p-3 border-t border-border">
                                      <textarea 
                                        className="w-full h-[100px] bg-background/50 border border-border/50 rounded p-3 text-base resize-none focus:outline-none focus:border-primary/50 focus:bg-background transition-colors text-muted-foreground"
                                        placeholder="• Market conditions and trend analysis&#10;• Key support/resistance levels&#10;• Entry strategy and timeframe&#10;• Trade setup confirmation..."
                                        value={analysisEntry.Analysis ?? ""}
                                        onChange={(e) => handleAnalysisFieldChange(selectedTrade.id, "Analysis", e.target.value)}
                                        onBlur={() => handleAnalysisBlur(selectedTrade.id)}
                                      ></textarea>
                                    </div>
                                  )}
                                </div>

                                {/* Risk Management */}
                                <div className="bg-widget-header/50 border border-border rounded overflow-hidden">
                                  <div className="flex items-center justify-between px-3 py-2.5 hover:bg-widget-header transition-colors">
                                  <button
                                    onClick={() => toggleNoteSection("risk")}
                                      className="flex items-center gap-2 flex-1 text-left"
                                  >
                                      <div className="w-1 h-4 bg-primary rounded-full" />
                                      <span className="text-base font-medium">Risk Management</span>
                                    </button>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSaveAnalysis(selectedTrade.id, {
                                            JournalID: getJournalID() ?? 0,
                                            TradeID: selectedTrade.id,
                                            Analysis: analysisEntry.Analysis,
                                            Risk: analysisEntry.Risk,
                                            PostAnalysis: analysisEntry.PostAnalysis,
                                          });
                                        }}
                                        disabled={isSaving}
                                        className="h-7 text-xs bg-transparent border border-border text-muted-foreground hover:bg-muted/20 px-4 mr-1"
                                      >
                                        {isSaving ? (
                                          <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Saving...
                                          </>
                                        ) : (
                                          <>
                                            <Save className="w-3 h-3 mr-1.5" />
                                            Save
                                          </>
                                        )}
                                      </Button>
                                      <button
                                        onClick={() => toggleNoteSection("risk")}
                                      >
                                    <ChevronDown 
                                      className={`w-4 h-4 transition-transform ${
                                        expandedNotes.has("risk") ? "rotate-180" : ""
                                      }`}
                                    />
                                  </button>
                                    </div>
                                  </div>
                                  {expandedNotes.has("risk") && (
                                    <div className="p-3 border-t border-border">
                                      <textarea 
                                        className="w-full h-[60px] bg-background/50 border border-border/50 rounded p-3 text-base resize-none focus:outline-none focus:border-primary/50 focus:bg-background transition-colors text-muted-foreground"
                                        placeholder="Additional risk notes..."
                                        value={analysisEntry.Risk ?? ""}
                                        onChange={(e) => handleAnalysisFieldChange(selectedTrade.id, "Risk", e.target.value)}
                                        onBlur={() => handleAnalysisBlur(selectedTrade.id)}
                                      ></textarea>
                                    </div>
                                  )}
                                </div>

                                {/* Post-Trade Review */}
                                <div className="bg-widget-header/50 border border-border rounded overflow-hidden">
                                  <div className="flex items-center justify-between px-3 py-2.5 hover:bg-widget-header transition-colors">
                                  <button
                                    onClick={() => toggleNoteSection("postAnalysis")}
                                      className="flex items-center gap-2 flex-1 text-left"
                                  >
                                      <div className="w-1 h-4 bg-green-500 rounded-full" />
                                      <span className="text-base font-medium">Post-Trade Review</span>
                                    </button>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSaveAnalysis(selectedTrade.id, {
                                            JournalID: getJournalID() ?? 0,
                                            TradeID: selectedTrade.id,
                                            Analysis: analysisEntry.Analysis,
                                            Risk: analysisEntry.Risk,
                                            PostAnalysis: analysisEntry.PostAnalysis,
                                          });
                                        }}
                                        disabled={isSaving}
                                        className="h-7 text-xs bg-transparent border border-border text-muted-foreground hover:bg-muted/20 px-4 mr-1"
                                      >
                                        {isSaving ? (
                                          <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Saving...
                                          </>
                                        ) : (
                                          <>
                                            <Save className="w-3 h-3 mr-1.5" />
                                            Save
                                          </>
                                        )}
                                      </Button>
                                      <button
                                        onClick={() => toggleNoteSection("postAnalysis")}
                                      >
                                    <ChevronDown 
                                      className={`w-4 h-4 transition-transform ${
                                        expandedNotes.has("postAnalysis") ? "rotate-180" : ""
                                      }`}
                                    />
                                  </button>
                                    </div>
                                  </div>
                                  {expandedNotes.has("postAnalysis") && (
                                    <div className="p-3 border-t border-border">
                                      <textarea 
                                        className="w-full h-[100px] bg-background/50 border border-border/50 rounded p-3 text-base resize-none focus:outline-none focus:border-primary/50 focus:bg-background transition-colors text-muted-foreground"
                                        placeholder="• What went well?&#10;• What could be improved?&#10;• Key lessons learned&#10;• Emotional state during trade..."
                                        value={analysisEntry.PostAnalysis ?? ""}
                                        onChange={(e) => handleAnalysisFieldChange(selectedTrade.id, "PostAnalysis", e.target.value)}
                                        onBlur={() => handleAnalysisBlur(selectedTrade.id)}
                                      ></textarea>
                                        </div>
                                  )}
                                        </div>

                                <div className="bg-widget-header/50 border border-border rounded overflow-hidden">
                                  <button
                                    onClick={() => toggleNoteSection("generalNotes")}
                                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-widget-header transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-1 h-4 bg-slate-400 rounded-full" />
                                      <span className="text-base font-medium">General Notes</span>
                                        </div>
                                    <ChevronDown 
                                      className={`w-4 h-4 transition-transform ${
                                        expandedNotes.has("generalNotes") ? "rotate-180" : ""
                                      }`}
                                    />
                                  </button>
                                  {expandedNotes.has("generalNotes") && (
                                    <div className="p-3 border-t border-border">
                                      <textarea 
                                        className="w-full h-[120px] bg-background/50 border border-border/50 rounded p-3 text-base resize-none focus:outline-none focus:border-primary/50 focus:bg-background transition-colors text-muted-foreground"
                                        placeholder="Capture discretionary notes for this trade..."
                                        value={selectedTrade.notes ?? ""}
                                        onChange={(e) => handleTradeFieldChange(selectedTrade.id, "notes", e.target.value)}
                                      ></textarea>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {detailTab === "images" && (
                              <div className="flex-1 p-4 flex flex-col gap-4 overflow-auto">
                                {/* Selected Image Previews (before upload) */}
                                {selectedImagePreviews.length > 0 && (
                                  <div>
                                    <div className="text-base font-medium text-muted-foreground mb-2">
                                      Selected Images ({selectedImagePreviews.length}) {isSaving && <span className="text-primary">- Uploading...</span>}
                                    </div>
                                    <div className="grid grid-cols-6 gap-2">
                                      {selectedImagePreviews.map((preview, index) => (
                                        <div
                                          key={index}
                                          className="relative group aspect-square rounded overflow-hidden border border-primary/50 bg-widget-header"
                                        >
                                          <img
                                            src={preview.preview}
                                            alt={`Preview ${index + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                          {isSaving && (
                                            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                                              <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Drag and Drop Upload Area */}
                                <div
                                  onDragOver={handleDragOver}
                                  onDragLeave={handleDragLeave}
                                  onDrop={handleDrop}
                                  className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-colors ${
                                    isDragging
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                >
                                  <Upload className="w-8 h-8 text-muted-foreground" />
                                  <div className="text-center">
                                    <p className="text-base font-medium text-foreground mb-1">
                                      Drag and drop images here
                                    </p>
                                    <p className="text-base font-medium text-muted-foreground">or</p>
                                  </div>
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      multiple
                                      accept="image/*"
                                      onChange={handleFileSelect}
                                      className="hidden"
                                    />
                                    <span className="px-4 py-2 bg-primary text-primary-foreground rounded text-base font-medium hover:bg-primary/90 transition-colors inline-block">
                                      Browse Files
                                    </span>
                                  </label>
                                </div>

                                {/* Uploaded Images Gallery */}
                                {uploadedImages.length > 0 && (
                                  <div>
                                    <div className="text-base font-medium text-muted-foreground mb-2">
                                      Uploaded Images ({uploadedImages.length})
                                    </div>
                                    <div className="grid grid-cols-6 gap-2">
                                      {uploadedImages.map((image, index) => (
                                        <div
                                          key={index}
                                          className="relative group aspect-square rounded overflow-hidden border border-border bg-widget-header cursor-pointer hover:border-primary transition-colors"
                                          onClick={() => setViewingImage(image)}
                                        >
                                          <img
                                            src={image}
                                            alt={`Upload ${index + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              console.error('Failed to load image:', image);
                                              // Try to construct full URL if it failed
                                              const fullUrl = getImageUrl(image);
                                              if (fullUrl !== image && fullUrl) {
                                                (e.target as HTMLImageElement).src = fullUrl;
                                              } else {
                                                // If still fails, show placeholder
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ccc"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EFailed to load%3C/text%3E%3C/svg%3E';
                                              }
                                            }}
                                          />
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeImage(index);
                                            }}
                                            className="absolute top-0.5 right-0.5 p-0.5 bg-background/90 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }))
                }
            </div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="flex-1 flex flex-col overflow-hidden m-0 p-0">
            <div className="flex-1 flex flex-col overflow-auto">
              {/* Calendar Header */}
              <div className="bg-widget-header border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => navigateMonth(-1)}
                    className="p-1 hover:bg-background rounded transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-lg font-medium">{monthNames[currentMonth]} {currentYear}</div>
                  <button 
                    onClick={() => navigateMonth(1)}
                    className="p-1 hover:bg-background rounded transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={jumpToCurrentMonth}
                    className="px-3 py-1.5 bg-background border border-border rounded text-base font-medium hover:bg-widget-header transition-colors"
                  >
                    This month
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-base font-medium">
                    <span className="text-muted-foreground">Monthly stats:</span>
                    <span className={`px-2 py-0.5 rounded ${monthlyStats.totalProfit >= 0 ? "text-green-400 bg-green-400/10" : "text-red-500 bg-red-500/10"}`}>
                      {formatAmount(monthlyStats.totalProfit)}
                    </span>
                    <span className="text-blue-400 px-2 py-0.5 bg-blue-400/10 rounded">
                      {monthlyStats.totalTrades} {monthlyStats.totalTrades === 1 ? "trade" : "trades"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Calendar Grid with Week Summary */}
              <div className="flex-1 flex gap-2 p-4">
                <div className="flex-1 flex flex-col gap-2">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="text-center text-base font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="flex-1 flex flex-col gap-2">
                    {generateCalendar().map((week, weekIndex) => (
                      <div key={weekIndex} className="grid grid-cols-7 gap-2">
                        {week.map((day, dayIndex) => {
                          const hasProfit = day.tradeData && day.tradeData.profit > 0;
                          const hasLoss = day.tradeData && day.tradeData.profit < 0;
                          
                          return (
                            <div
                              key={dayIndex}
                              className={`
                                relative border rounded p-2 flex flex-col items-center justify-center h-[112px]
                                ${!day.isCurrentMonth ? "bg-widget-header/30 border-border/30 text-muted-foreground/40" : ""}
                                ${day.isCurrentMonth && !day.hasTrade ? "bg-widget-header border-border" : ""}
                                ${hasProfit ? "bg-green-500/20 border-green-500/40" : ""}
                                ${hasLoss ? "bg-red-500/20 border-red-500/40" : ""}
                              `}
                            >
                              {/* Day Number - Top Right */}
                              <div className="absolute top-1 right-2 text-base font-medium">
                                {day.day}
                              </div>
                              
                              {/* Trade Data */}
                              {day.hasTrade && day.tradeData && (
                                <div className="flex flex-col items-center justify-center gap-0.5 mt-2 w-full px-1">
                                  {/* Dollar Amount */}
                                  <div className={`text-xl font-semibold ${hasProfit ? "text-green-400" : "text-red-500"}`}>
                                    {formatAmount(day.tradeData.profit)}
                                  </div>
                                  {/* Trade Pairs */}
                                  {day.tradeData.pairs && day.tradeData.pairs.length > 0 && (
                                    <div className="text-xs font-medium text-foreground/80 text-center">
                                      {day.tradeData.pairs.length <= 2 
                                        ? day.tradeData.pairs.join(", ")
                                        : `${day.tradeData.pairs.slice(0, 2).join(", ")} +${day.tradeData.pairs.length - 2}`}
                                    </div>
                                  )}
                                  {/* Percentage Gain */}
                                  <div className={`text-sm font-medium ${day.tradeData.percentGain >= 0 ? "text-green-400/80" : "text-red-500/80"}`}>
                                    {day.tradeData.percentGain >= 0 ? "+" : ""}{day.tradeData.percentGain.toFixed(2)}%
                                  </div>
                                  {/* Number of Trades */}
                                  <div className="text-xs text-muted-foreground">
                                    {day.tradeData.trades} trade{day.tradeData.trades > 1 ? "s" : ""}
                                  </div>
                                  {/* Pips and Win Rate */}
                                  <div className={`text-xs ${day.tradeData.pips >= 0 ? "text-green-400/70" : "text-red-500/70"}`}>
                                    {day.tradeData.pips >= 0 ? "+" : ""}{day.tradeData.pips.toFixed(2)} P, {day.tradeData.winRate.toFixed(0)}%
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Week Summary Column */}
                <div className="w-32 flex flex-col gap-2">
                  <div className="text-center text-[11px] text-muted-foreground py-2">
                    {/* Empty header to align with day headers */}
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    {calculateWeeklyBreakdown.map((weekData) => {
                      const hasNoTrades = weekData.total === 0 && weekData.days === 0;
                      return (
                      <div 
                        key={weekData.week}
                          className={`border rounded p-2 flex flex-col items-center justify-center h-[112px] ${
                            hasNoTrades 
                              ? "bg-widget-header/50 border-border/50" 
                              : "bg-widget-header border-border"
                          }`}
                        >
                          <div className={`text-base mb-1 ${hasNoTrades ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                            Week {weekData.week}
                        </div>
                          <div className={`text-xl font-semibold ${
                            hasNoTrades 
                              ? "text-muted-foreground/40" 
                              : weekData.total >= 0 
                                ? "text-green-400" 
                                : "text-red-500"
                          }`}>
                            {hasNoTrades ? "$0.00" : formatAmount(weekData.total)}
                      </div>
                          <div className={`text-base mt-1 ${
                            hasNoTrades 
                              ? "text-muted-foreground/40" 
                              : "text-blue-400"
                          }`}>
                            {weekData.days} day{weekData.days > 1 ? "s" : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="flex-1 flex flex-col overflow-hidden m-0 p-0">
            <div className="flex-1 p-4 overflow-auto">
              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-background border border-border rounded p-4">
                  <div className="text-base text-muted-foreground mb-2">Total Return</div>
                  <div className={`text-2xl font-semibold ${statsMetrics.totalReturn >= 0 ? "text-green-400" : "text-red-500"}`}>
                    {statsMetrics.totalReturn >= 0 ? "+" : ""}{statsMetrics.totalReturn.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-background border border-border rounded p-4">
                  <div className="text-base text-muted-foreground mb-2">Return this Month</div>
                  <div className={`text-2xl font-semibold ${statsMetrics.returnThisMonth >= 0 ? "text-green-400" : "text-red-500"}`}>
                    {statsMetrics.returnThisMonth >= 0 ? "+" : ""}{statsMetrics.returnThisMonth.toFixed(2)}%
                  </div>
                </div>
                <div className="bg-background border border-border rounded p-4">
                  <div className="text-base text-muted-foreground mb-2">Total Hitrate</div>
                  <div className="text-primary text-2xl font-semibold">{statsMetrics.totalHitrate.toFixed(1)}%</div>
                </div>
                <div className="bg-background border border-border rounded p-4">
                  <div className="text-base text-muted-foreground mb-2">Hitrate this Month</div>
                  <div className="text-primary text-2xl font-semibold">{statsMetrics.hitrateThisMonth.toFixed(1)}%</div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Win/Loss Distribution */}
                <div className="bg-background border border-border rounded p-4">
                  <div className="text-base font-medium mb-4">Win/Loss Distribution</div>
                  <div className="h-[200px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={winLossData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {winLossData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                            border: '1px solid rgba(100, 116, 139, 0.5)',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Total Return by Trade */}
                <div className="bg-background border border-border rounded p-4">
                  <div className="text-base font-medium mb-4">Total Return by Trade</div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={totalReturnByTradeData.length > 0 ? totalReturnByTradeData : [{ trade: 1, return: 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                        <XAxis 
                          dataKey="trade" 
                          stroke="rgba(148, 163, 184, 0.5)"
                          style={{ fontSize: '13px' }}
                        />
                        <YAxis 
                          stroke="rgba(148, 163, 184, 0.5)"
                          style={{ fontSize: '13px' }}
                          domain={totalReturnDomain}
                          tickFormatter={(value: number) => {
                            if (Math.abs(value) >= 1000) {
                              return `${(value / 1000).toFixed(1)}k%`;
                            }
                            return `${value.toFixed(1)}%`;
                          }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                            border: '1px solid rgba(100, 116, 139, 0.5)',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                          formatter={(value: any) => `${(value as number).toFixed(2)}%`}
                        />
                        <Line type="monotone" dataKey="return" stroke="#f97316" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Equity Curve */}
                <div className="bg-background border border-border rounded p-4">
                  <div className="text-base font-medium mb-4">Equity Curve</div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={equityCurveData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                        <XAxis 
                          dataKey="trade" 
                          stroke="rgba(148, 163, 184, 0.5)"
                          style={{ fontSize: '13px' }}
                        />
                        <YAxis 
                          stroke="rgba(148, 163, 184, 0.5)"
                          style={{ fontSize: '13px' }}
                          domain={equityCurveDomain}
                          tickFormatter={(value: number) => {
                            if (value >= 1000000) {
                              return `$${(value / 1000000).toFixed(2)}M`;
                            }
                            if (value >= 1000) {
                              return `$${(value / 1000).toFixed(1)}K`;
                            }
                            return `$${value.toFixed(0)}`;
                          }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                            border: '1px solid rgba(100, 116, 139, 0.5)',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                          formatter={(value: any) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        />
                        <Line type="monotone" dataKey="equity" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Cumulative Profit */}
                <div className="bg-background border border-border rounded p-4">
                  <div className="text-base font-medium mb-4">Cumulative Profit</div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cumulativeProfitData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                        <XAxis 
                          dataKey="trade" 
                          stroke="rgba(148, 163, 184, 0.5)"
                          style={{ fontSize: '13px' }}
                        />
                        <YAxis 
                          stroke="rgba(148, 163, 184, 0.5)"
                          style={{ fontSize: '13px' }}
                          domain={cumulativeProfitDomain}
                          tickFormatter={(value: number) => {
                            if (Math.abs(value) >= 1000000) {
                              return `$${(value / 1000000).toFixed(2)}M`;
                            }
                            if (Math.abs(value) >= 1000) {
                              return `$${(value / 1000).toFixed(1)}K`;
                            }
                            return `$${value.toFixed(0)}`;
                          }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                            border: '1px solid rgba(100, 116, 139, 0.5)',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                          formatter={(value: any) => `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        />
                        <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      )}

      {/* Image Viewer Overlay - In-Widget */}
      {viewingImage && (
        <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="text-lg font-semibold">Image Viewer</h3>
            <button
              onClick={() => setViewingImage(null)}
              className="p-1 hover:bg-widget-header rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Image Content */}
          <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
            <img
              src={viewingImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded border border-border shadow-lg"
            />
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-border flex gap-2">
            <button className="flex-1 px-3 py-2 bg-widget-header hover:bg-background rounded text-base transition-colors">
              Download
            </button>
            <button 
              onClick={() => {
                const index = uploadedImages.indexOf(viewingImage);
                if (index > -1) {
                  removeImage(index);
                  setViewingImage(null);
                }
              }}
              className="flex-1 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded text-base transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={confirmDeleteTrade}
        title="Delete Trade"
        message="Are you sure you want to delete this trade? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        sharpCorners={true}
      />
    </div>
  );
}

