/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  TrendingUp,
  BarChart3,
  ListChecks,
  Newspaper,
  Settings2,
  Calendar,
  Activity,
  Check,
  TrendingDown,
  Plus,
  Trash2,
  Edit3,
  Pencil,
  ChevronRight,
  Tag,
} from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Checkbox } from "../ui/checkbox";
import { getMoodBoardController, type MoodBoardController, type MoodBoardSnapshot } from "@/components/widgets/utilities/MoodBoard";
import { cn } from "../ui/utils";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  type TicklistTitle,
} from "@/components/widgets/utilities/Ticklist/ticklistApi";
import {
  getJournalTitles,
  newJournalFromWidget,
  deleteJournal,
  updateJournal,
  type JournalTitle,
} from "@/components/widgets/utilities/TradingJournal/tradingJournalApi";
import {
  getUserNotes,
  addUserNote,
  deleteUserNote,
  updateUserNoteTitleTags,
  type Note,
} from "@/components/widgets/utilities/Notes/notesApi";
import {
  getWatchlists,
  createWatchlistAndAddToDashboard,
  updateWatchlist,
  deleteWatchlist,
  type Watchlist,
} from "@/components/widgets/utilities/Watchlist/api";
import { availableWidgets } from "@/constants/widgets";

export interface WidgetSettings {
  // Trading Chart Settings
  currencies?: string[];
  timeframe?: string;
  chartType?: string;
  dataType?: string;
  indicators?: string[];
  showVolume?: boolean;
  
  // Order Book Settings
  depth?: number;
  grouping?: string;
  
  // Watchlist Settings
  columns?: string[];
  watchlistId?: string | number; // Selected watchlist ID
  // sortBy is used by both Watchlist and DMX Overview
  
  // News Feed Settings
  categories?: string[] | null;
  sources?: string[];
  newsDisplayMode?: "widget-slider" | "fullscreen-slider" | "popup";
  newsStoryFilter?: string;
  
  // Trading Panel Settings
  orderType?: string;
  leverage?: number;
  
  // Date Range
  dateFrom?: string;
  dateTo?: string;
  timespan?: string; // For Risk Reversals: '5D', '10D', '1M'
  
  // FX Volatility Levels Settings
  symbol?: string;
  periodType?: "Daily" | "Weekly" | "Monthly";
  
  // Average Daily Range Settings
  // Note: period is controlled via D|W|M buttons in widget header, not settings
  
  // News Sentiment Settings
  module?: string; // "Forex", "US Stocks", "Commodities", etc.
  symbols?: string; // Symbol string (e.g., "EURUSD", "NASDAQ:AAPL", "XAUUSD")
  widgetTitle?: string; // "sentiment_score" or other widget type
  
  // Trending Topics Settings
  limit?: number; // Number of items to return (default: 15)

  // Central Banks
  bankName?: string;

  // DMX Overview Settings
  assetClass?: string; // "forex" | "crypto" | "commodities" | "indices"
  timeFrame?: string; // "monthly" | "daily" | "4h" | "1h"
  sortBy?: string; // "default" | "pair-az" | "pair-za" | "long-lh" | "long-hl" | "short-lh" | "short-hl"

  // DMX Open Interest Settings
  baseCurrency?: string; // "XXX" | "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "CHF" | "NZD"
  quoteCurrency?: string; // "USD" | "EUR" | "GBP" | "JPY" | "AUD" | "CAD" | "CHF" | "NZD"
  filterMode?: string; // "all" | "top5-short" | "top5-long" | "top10-short" | "top10-long" | pair name

  // Latest Stories Settings
  displayMode?: string;
  latestStoriesCategory?: string;
  latestStoriesSentiment?: string;
  
  // Overview List Settings
  listType?: string; // "Forex" | "Stocks" | "Commodities": "Positive" | "Negative" | "Neutral";
  latestStoriesPublished?: number;

  // Tabbed Widget Settings
  tabBarPosition?: "top" | "bottom"; // Position of tab bar (default: "bottom")

  // Trading Journal Settings
  journalID?: string;
  
  // Notes Settings
  noteID?: number | string;
  
  // Economic Calendar Settings
  currency?: string; // Currency filter for economic calendar (e.g., "USD", "EUR", "all")
  dateRangeType?: 'today' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'custom'; // Date range selection type
  customStartDate?: string; // Custom start date (DD/MM/YYYY format)
  customEndDate?: string; // Custom end date (DD/MM/YYYY format)
  autoUpdate?: boolean; // Auto-update enabled/disabled
  orientation?: 'vertical' | 'horizontal'; // Orientation for stacking days (vertical or horizontal)

  // COT Widget Settings
  owner?: string; // Owner/reporter type for COT positioning (e.g., "leveraged funds", "Dealer")
  time?: string; // Time period for COT chart (e.g., "3 years", "1 year")
  cotDataType?: string; // COT data type (e.g., "LongShortPosition", "NetPosition")
  cotOwner?: string; // COT owner filter (e.g., "Dealer", "AssetManager", "Leveraged")
  cotCurrency?: string; // COT currency/symbol (e.g., "EUR", "USD", "GBP")
  cotDuration?: string; // COT duration/timeframe in days (e.g., "365", "730", "1825", "7300")

  // Seasonality Performance Chart Settings
  show5Y?: boolean; // Show 5-year line
  show10Y?: boolean; // Show 10-year line
  show15Y?: boolean; // Show 15-year line

  // Smart Bias Settings
  view?: string; // View type (e.g., "Scanner", "Currencies")
  week?: string; // Week selector
  weeksBack?: string; // Weeks back filter for history

  // Average Range Settings
  rangeType?: string; // Range type (e.g., "D", "W", "M")

  // Realtime Headline Ticker Settings
  newsSections?: string[]; // Selected news sections (e.g., "DAX", "US Equities", "Fed")
  newsPriorities?: string[]; // Selected news priorities (e.g., "Important", "Rumour", "Highlighted", "Normal")
}

// Default sections for Realtime Headline Ticker - defined once for consistency
// Exported for use in BloombergDashboard and other components
export const REALTIME_NEWS_DEFAULT_SECTIONS = [
  // Equities
  'DAX', 'CAC', 'SMI', 'US Equities', 'Asian Equities', 'FTSE 100', 'European Equities',
  'Global Equities', 'UK Equities', 'EUROSTOXX', 'US Equity Plus',
  // Economic Releases
  'US Data', 'Swiss Data', 'EU Data', 'Canadian Data', 'Other Data', 'UK Data',
  // Central Banks
  'Other Central Banks', 'BoC', 'RBNZ', 'RBA', 'SNB', 'BoJ', 'BoE', 'ECB', 'PBoC', 'Fed', 'Bank Research',
  // News Commentary
  'Fixed Income', 'Geopolitical', 'Rating Agency comments', 'Global News', 'Market Analysis',
  'FX Flows', 'Asian News', 'Economic Commentary', 'Brexit', 'Energy & Power', 'Metals',
  'Ags & Softs', 'Crypto', 'Emerging Markets', 'US Election', 'Trade',
  // PMT Update
  'Newsquawk Update'
];

export const REALTIME_NEWS_DEFAULT_PRIORITIES = ['Important', 'Rumour', 'Highlighted', 'Normal'];

interface WidgetSettingsSlideInProps {
  isOpen: boolean;
  onClose: () => void;
  widgetType: string;
  widgetPosition: string;
  widgetInstanceId?: string;
  activeTemplateId?: string; // Template ID for auto-saving settings
  currentSettings: WidgetSettings;
  onSave: (settings: WidgetSettings) => void;
  isModuleLocked?: boolean; // Lock Asset Class selection (for Details templates)
  isSymbolLocked?: boolean; // Lock Symbol selection (for Details templates)
  // Ticklist-specific props
  ticklistHandlers?: {
    ticklists: TicklistTitle[];
    taskListID: number | null;
    isLoadingLists: boolean;
    isSaving: boolean;
    isCreatingList: boolean;
    newListName: string;
    initialTaskName: string;
    onSelectTicklist: (value: string) => Promise<void>;
    onCreateTicklist: () => Promise<void>;
    onDeleteList: (ticklistId: number) => Promise<void>;
    onSetIsCreatingList: (value: boolean) => void;
    onSetNewListName: (value: string) => void;
    onSetInitialTaskName: (value: string) => void;
    onRefreshTicklists: () => Promise<TicklistTitle[]>;
    getTemplateId: () => number | null;
    getNumericSetting: (value: unknown, fallback: number) => number;
    wgid?: string;
    widgetSettings?: Record<string, any>;
  };
}

export function WidgetSettingsSlideIn({
  isOpen,
  onClose,
  widgetType,
  widgetPosition,
  widgetInstanceId,
  activeTemplateId,
  currentSettings,
  onSave,
  ticklistHandlers,
  isModuleLocked = false,
  isSymbolLocked = false,
}: WidgetSettingsSlideInProps) {
  const [settings, setSettings] = useState<WidgetSettings>(currentSettings);
  
  
  // Auto-save function that calls onSave immediately whenever settings change
  const autoSaveSettings = useCallback((newSettings: WidgetSettings) => {
    // Normalize settings before saving (same logic as handleSave)
    const normalizedSettings = { ...newSettings };
    
    // For DMX widgets, normalize symbol format by removing slashes
    if (widgetType === 'dmx-positioning' || widgetType === 'dmx-open-interest') {
      if (normalizedSettings.symbol && normalizedSettings.symbol.includes('/')) {
        normalizedSettings.symbol = normalizedSettings.symbol.replace('/', '');
      }
    }
    
    // For COT Chart View, ensure we preserve symbol and chartType
    if (widgetType === 'cot-chart-view') {
      normalizedSettings.symbol = normalizedSettings.symbol || currentSettings?.symbol || currentSettings?.cotCurrency || 'USD';
      normalizedSettings.chartType = normalizedSettings.chartType || currentSettings?.chartType || 'bar chart';
    }
    
    // Call the onSave callback to trigger updateWidgetFields API
    onSave(normalizedSettings);
  }, [widgetType, currentSettings, onSave]);
  
  // Deferred open state - becomes true after animation starts, used for heavy operations
  // This allows the panel to slide in smoothly before triggering API calls
  const [deferredOpen, setDeferredOpen] = useState(false);
  
  // Track if settings are being synced from props to avoid auto-saving
  const isSyncingSettings = useRef(false);
  
  useEffect(() => {
    if (isOpen) {
      // Defer heavy operations until after animation starts
      const timer = setTimeout(() => setDeferredOpen(true), 50);
      return () => clearTimeout(timer);
    } else {
      setDeferredOpen(false);
      // Reset syncing flag when panel closes
      isSyncingSettings.current = false;
    }
  }, [isOpen]);
  
  // Auto-save settings whenever they change (except during sync)
  useEffect(() => {
    // Skip auto-save if panel is not open or if we're syncing from props
    if (!deferredOpen || isSyncingSettings.current) {
      return;
    }
    
    // Debounce auto-save to avoid too many API calls
    const timeoutId = setTimeout(() => {
      console.log('💾 [WidgetSettings] Auto-saving settings:', settings);
      autoSaveSettings(settings);
    }, 500); // Wait 500ms after last change before saving
    
    return () => clearTimeout(timeoutId);
  }, [settings, deferredOpen, autoSaveSettings]);

  // Sync settings when currentSettings changes or when panel opens (e.g., when loaded from database)
  useEffect(() => {
    if (deferredOpen) {
      // Mark that we're syncing to prevent auto-save
      isSyncingSettings.current = true;
      
      // Always sync when panel opens to ensure we have the latest settings
      const syncedSettings = { ...currentSettings };
      
      // For analyst-recommendations, price-targets, insider-transactions, institutional-shareholders, balance-sheet, income-statement, and cash-flow-report, ensure module is always US Stocks
      if ((widgetType === 'analyst-recommendations' || widgetType === 'price-targets' || widgetType === 'insider-transactions' || widgetType === 'institutional-shareholders' || widgetType === 'balance-sheet' || widgetType === 'income-statement' || widgetType === 'cash-flow-report') && syncedSettings.module !== 'US Stocks') {
        syncedSettings.module = 'US Stocks';
      }
      
      // For realtime-headline-ticker, ensure sections and priorities are initialized
      if (widgetType === 'realtime-headline-ticker') {
        // Only set defaults if the properties are completely undefined (never been set)
        // Respect empty arrays as intentional "nothing selected" state
        if (syncedSettings.newsSections === undefined) {
          syncedSettings.newsSections = [...REALTIME_NEWS_DEFAULT_SECTIONS];
        }
        if (syncedSettings.newsPriorities === undefined) {
          syncedSettings.newsPriorities = [...REALTIME_NEWS_DEFAULT_PRIORITIES];
        }
      }
      
      setSettings(syncedSettings);
      
      // After a short delay, allow auto-saving again
      setTimeout(() => {
        isSyncingSettings.current = false;
      }, 100);
    }
  }, [currentSettings, deferredOpen, widgetType]);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [symbolsLoading, setSymbolsLoading] = useState<boolean>(false);
  const [symbolsError, setSymbolsError] = useState<string | null>(null);
  const [lastFetchedModule, setLastFetchedModule] = useState<string | null>(null);
  // Store symbols per asset class for dmx-statistics-table
  const [dmxSymbolsByAssetClass, setDmxSymbolsByAssetClass] = useState<Record<string, string[]>>({});
  const [dmxSymbolsLoading, setDmxSymbolsLoading] = useState<Record<string, boolean>>({});
  const [moodboardState, setMoodboardState] = useState<MoodBoardSnapshot | null>(null);
  const [isMoodboardCreating, setIsMoodboardCreating] = useState(false);
  const [newMoodboardName, setNewMoodboardName] = useState("");
  const moodboardControllerRef = useRef<MoodBoardController | null>(null);

  // Economic Data Charts - dynamic options from API
  const [econCountry, setEconCountry] = useState<string>('');
  const [econTab, setEconTab] = useState<string>('');
  const [econIndicator, setEconIndicator] = useState<string>('');
  const [econCountries, setEconCountries] = useState<string[]>([]);
  
  // Economic Calendar date picker state
  const [startDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [econTabs, setEconTabs] = useState<string[]>([]);
  const [econEvents, setEconEvents] = useState<string[]>([]);
  // Search state for categories and events
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [eventsByTab, setEventsByTab] = useState<Record<string, string[]>>({});
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  // Lazy global index: country -> tab -> events[] (filled as user searches)
  const [eventsIndex, setEventsIndex] = useState<Record<string, Record<string, string[]>>>({});
  const searchResultsRef = useRef<HTMLDivElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fetchedEventsRef = useRef<Set<string>>(new Set());
  const fetchingEventsRef = useRef<Set<string>>(new Set());
  const prevCountryTabRef = useRef<string>('');
  const prefetchedCountriesRef = useRef<Set<string>>(new Set());
  const prefetchingRef = useRef<boolean>(false);

  // Trading Journal Settings
  const [journalOptions, setJournalOptions] = useState<JournalTitle[]>([]);
  const [journalLoading, setJournalLoading] = useState<boolean>(false);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [isCreatingJournalSetting, setIsCreatingJournalSetting] = useState(false);
  const [newJournalSettingName, setNewJournalSettingName] = useState("");
  const [isRenamingJournalSetting, setIsRenamingJournalSetting] = useState(false);
  const [renameJournalSettingValue, setRenameJournalSettingValue] = useState("");
  const [journalToDelete, setJournalToDelete] = useState<number | null>(null);
  const [isDeletingJournal, setIsDeletingJournal] = useState(false);

  // Notes Settings
  const [notesOptions, setNotesOptions] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState<boolean>(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [isCreatingNoteSetting, setIsCreatingNoteSetting] = useState(false);
  const [newNoteSettingName, setNewNoteSettingName] = useState("");
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState("");
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);
  const [editingTagsForNoteId, setEditingTagsForNoteId] = useState<number | null>(null);
  const [newTag, setNewTag] = useState("");

  // Watchlist Settings
  const [watchlistOptions, setWatchlistOptions] = useState<Watchlist[]>([]);
  const [watchlistLoading, setWatchlistLoading] = useState<boolean>(false);
  const [watchlistError, setWatchlistError] = useState<string | null>(null);
  const [isCreatingWatchlistSetting, setIsCreatingWatchlistSetting] = useState(false);
  const [newWatchlistSettingName, setNewWatchlistSettingName] = useState("");
  const [isRenamingWatchlistSetting, setIsRenamingWatchlistSetting] = useState(false);
  const [renameWatchlistSettingValue, setRenameWatchlistSettingValue] = useState("");
  const [watchlistToDelete, setWatchlistToDelete] = useState<string | null>(null);
  const [isDeletingWatchlist, setIsDeletingWatchlist] = useState(false);

  const widgetUniqueId = widgetInstanceId || widgetPosition;

  const emitJournalEvent = useCallback(
    (detail: { action: 'select' | 'create' | 'delete'; journalId?: number | null }) => {
      if (typeof window === 'undefined') return;
      window.dispatchEvent(
        new CustomEvent('trading-journal:settings-change', {
          detail: {
            ...detail,
            widgetId: widgetUniqueId,
          },
        })
      );
    },
    [widgetUniqueId]
  );

  const parseJournalId = (value?: string | number | null): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return undefined;
  };

  const currentJournalIdRef = useRef<number | undefined>(
    parseJournalId(currentSettings?.journalID ?? settings?.journalID ?? null)
  );

  useEffect(() => {
    currentJournalIdRef.current = parseJournalId(settings?.journalID ?? null);
  }, [settings?.journalID]);

  // DMX Positioning: No longer needs separate symbol fetching - now uses dmxSymbolsByAssetClass like dmx-open-interest
  // Symbol fetching is handled by the shared useEffect for both dmx-statistics-table and dmx-open-interest
  // which has been updated to include dmx-positioning

const getJournalIdFromTitle = (journal: JournalTitle): number | undefined =>
  journal.ID ?? journal.Title ?? journal.WidgetID ?? undefined;

  const loadJournalTitles = useCallback(
    async (preferredId?: number) => {
      if (widgetType !== 'trading-journal') {
        return;
      }
      setJournalLoading(true);
      setJournalError(null);
      try {
        const titles = await getJournalTitles();
        setJournalOptions(titles);
        if (titles.length === 0) {
          return;
        }
        const currentId = currentJournalIdRef.current;
        const hasCurrent =
          typeof currentId === 'number' && titles.some((journal) => getJournalIdFromTitle(journal) === currentId);

        const firstId = getJournalIdFromTitle(titles[0]);
        const fallbackId = preferredId ?? (hasCurrent ? currentId : firstId);

        if (typeof preferredId === 'number' && preferredId > 0 && preferredId !== currentId) {
          setSettings((prev) => ({ ...prev, journalID: String(preferredId) }));
        } else if ((!hasCurrent || !currentId) && typeof fallbackId === 'number') {
          setSettings((prev) => ({ ...prev, journalID: String(fallbackId) }));
        }
      } catch (err) {
        console.error('Error loading journals:', err);
        setJournalOptions([]);
        setJournalError(err instanceof Error ? err.message : 'Failed to load journals');
      } finally {
        setJournalLoading(false);
      }
    },
    [widgetType]
  );

  const handleJournalSelect = useCallback(
    (journalId: number) => {
      setIsRenamingJournalSetting(false);
      setRenameJournalSettingValue('');
      setSettings((prev) => ({ ...prev, journalID: String(journalId) }));
      emitJournalEvent({ action: 'select', journalId });
    },
    [emitJournalEvent]
  );

  const handleCreateJournalSetting = useCallback(async () => {
    const trimmed = newJournalSettingName.trim();
    if (!trimmed) {
      setJournalError('Journal name is required');
      return;
    }
    try {
      const created = await newJournalFromWidget(trimmed);
      const createdId = created?.ID ?? created?.Title ?? created?.WidgetID ?? null;
      setNewJournalSettingName('');
      setIsCreatingJournalSetting(false);
      await loadJournalTitles(createdId ?? undefined);
      if (createdId) {
        emitJournalEvent({ action: 'create', journalId: createdId });
        setSettings((prev) => ({ ...prev, journalID: String(createdId) }));
      }
    } catch (err) {
      console.error('Error creating journal:', err);
      setJournalError(err instanceof Error ? err.message : 'Failed to create journal');
    }
  }, [newJournalSettingName, loadJournalTitles, emitJournalEvent]);

  const handleRenameJournalSetting = useCallback(async () => {
    const targetId = settings.journalID ? parseInt(String(settings.journalID), 10) : null;
    if (!targetId) {
      setJournalError('Select a journal to rename');
      return;
    }
    const trimmed = renameJournalSettingValue.trim();
    if (!trimmed) {
      setJournalError('New journal name is required');
      return;
    }
    try {
      await updateJournal({ ID: targetId, Name: trimmed });
      setIsRenamingJournalSetting(false);
      setRenameJournalSettingValue('');
      await loadJournalTitles(targetId);
      emitJournalEvent({ action: 'select', journalId: targetId });
    } catch (err) {
      console.error('Error renaming journal:', err);
      setJournalError(err instanceof Error ? err.message : 'Failed to rename journal');
    }
  }, [settings.journalID, renameJournalSettingValue, loadJournalTitles, emitJournalEvent]);

  const requestDeleteJournalSetting = useCallback((journalId: number) => {
    if (!journalId) return;
    setJournalError(null);
    setJournalToDelete(journalId);
  }, []);

  const handleDeleteJournalSetting = useCallback(async () => {
    if (!journalToDelete) return;
    try {
      setIsDeletingJournal(true);
      await deleteJournal(journalToDelete);
      await loadJournalTitles();
      emitJournalEvent({ action: 'delete', journalId: journalToDelete });
      if (settings.journalID === String(journalToDelete)) {
        setSettings((prev) => ({ ...prev, journalID: undefined }));
      }
    } catch (err) {
      console.error('Error deleting journal:', err);
      setJournalError(err instanceof Error ? err.message : 'Failed to delete journal');
    } finally {
      setIsDeletingJournal(false);
      setJournalToDelete(null);
    }
  }, [journalToDelete, emitJournalEvent, loadJournalTitles, settings.journalID]);

  const handleRefreshJournalSettings = useCallback(() => {
    loadJournalTitles();
  }, [loadJournalTitles]);


const CENTRAL_BANK_OPTIONS = [
  "Federal Reserve",
  "European Central Bank",
  "Bank of England",
  "Bank of Japan",
  "Bank of Canada",
  "Reserve Bank of Australia",
  "Reserve Bank of New Zealand",
  "Swiss National Bank",
];

const IMPLIED_FORWARD_SYMBOLS = [
  "USDOIS",
  "EUROIS",
  "GBPOIS",
  "JPYOIS",
  "CADOIS",
  "AUDOIS",
  "NZDOIS",
  "CHFOIS",
];

const PROBABILITY_TABLE_SYMBOLS = [
  "FF_DISTR",
  "ECB_OIS_DISTR",
  "BOE_OIS_DISTR",
  "BOJ_OIS_DISTR",
  "BOC_OIS_DISTR",
  "RBA_OIS_DISTR",
  "RBNZ_OIS_DISTR",
  "SNB_OIS_DISTR",
];

  useEffect(() => {
    if (!deferredOpen || widgetType !== 'moodboard' || !widgetInstanceId) {
      setMoodboardState(null);
      moodboardControllerRef.current = null;
      return;
    }

    const controller = getMoodBoardController(widgetInstanceId);
    moodboardControllerRef.current = controller ?? null;

    if (!controller) {
      setMoodboardState(null);
      return;
    }

    setMoodboardState(controller.getSnapshot());
    const unsubscribe = controller.subscribe((snapshot) => {
      setMoodboardState(snapshot);
    });

    return () => {
      unsubscribe?.();
    };
  }, [deferredOpen, widgetInstanceId, widgetType]);

  useEffect(() => {
    if (!isOpen) {
      setIsMoodboardCreating(false);
      setNewMoodboardName('');
      setIsCreatingJournalSetting(false);
      setNewJournalSettingName('');
      setIsRenamingJournalSetting(false);
      setRenameJournalSettingValue('');
      setJournalError(null);
      setIsCreatingNoteSetting(false);
      setNewNoteSettingName('');
      setNotesError(null);
      setEditingNoteId(null);
      setEditingNoteTitle('');
      setExpandedNoteId(null);
      setEditingTagsForNoteId(null);
      setNewTag('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!deferredOpen || widgetType !== 'trading-journal') {
      return;
    }
    loadJournalTitles();
  }, [deferredOpen, widgetType, loadJournalTitles]);

  // Load notes for Notes widget
  const loadNotes = useCallback(async () => {
    if (widgetType !== 'notes') {
      return;
    }
    setNotesLoading(true);
    setNotesError(null);
    try {
      const notes = await getUserNotes();
      // Sort by date, newest first
      const sortedNotes = notes.sort((a, b) => {
        const getDateValue = (noteDate: string | null | undefined): number => {
          if (!noteDate || typeof noteDate !== 'string' || noteDate.trim() === '') {
            return 0;
          }
          const date = new Date(noteDate);
          const time = date.getTime();
          return isNaN(time) ? 0 : time;
        };
        return getDateValue(b.NoteDate) - getDateValue(a.NoteDate);
      });
      setNotesOptions(sortedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotesError('Failed to load notes');
    } finally {
      setNotesLoading(false);
    }
  }, [widgetType]);

  useEffect(() => {
    if (!deferredOpen || widgetType !== 'notes') {
      return;
    }
    loadNotes();
  }, [deferredOpen, widgetType, loadNotes]);

  // Handle note selection
  const handleNoteSelect = useCallback((noteId: number) => {
    const updatedSettings = {
      ...settings,
      noteID: noteId,
    };
    setSettings(updatedSettings);
    // Save settings and close slide-in menu
    onSave(updatedSettings);
    onClose();
  }, [settings, onSave, onClose]);

  // Handle note creation
  const handleCreateNoteSetting = useCallback(async () => {
    const trimmed = newNoteSettingName.trim();
    if (!trimmed) {
      return;
    }
    try {
      setNotesError(null);
      const result = await addUserNote(trimmed);
      if (result.success) {
        setNewNoteSettingName('');
        setIsCreatingNoteSetting(false);
        await loadNotes();
        // Auto-select the newly created note - use ID from response if available, otherwise find by title
        if (result.data?.ID) {
          handleNoteSelect(result.data.ID);
        } else {
          const updatedNotes = await getUserNotes();
          const newNote = updatedNotes.find(n => n.NoteTitle.toLowerCase() === trimmed.toLowerCase());
          if (newNote) {
            handleNoteSelect(newNote.ID);
          }
        }
      } else {
        throw new Error(result.message || 'Failed to create note');
      }
    } catch (error) {
      console.error('Error creating note:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create note';
      setNotesError(errorMessage);
    }
  }, [newNoteSettingName, loadNotes, handleNoteSelect]);

  // Handle note deletion
  const handleDeleteNoteSetting = useCallback(async () => {
    if (noteToDelete === null) return;
    try {
      setIsDeletingNote(true);
      await deleteUserNote(noteToDelete);
      // If deleted note was selected, clear selection
      if (settings.noteID === noteToDelete) {
        setSettings((prev) => {
          const updated = { ...prev };
          delete updated.noteID;
          return updated;
        });
      }
      setNoteToDelete(null);
      await loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      setNotesError('Failed to delete note');
    } finally {
      setIsDeletingNote(false);
    }
  }, [noteToDelete, settings.noteID, loadNotes]);

  const requestDeleteNoteSetting = useCallback((noteId: number) => {
    setNoteToDelete(noteId);
  }, []);

  // Load watchlists for Watchlist widget
  const loadWatchlists = useCallback(async () => {
    if (widgetType !== 'watchlist') {
      return;
    }
    setWatchlistLoading(true);
    setWatchlistError(null);
    try {
      const response = await getWatchlists("-1"); // Get all watchlists
      if (response && response.Watchlists) {
        setWatchlistOptions(response.Watchlists);
      } else {
        setWatchlistOptions([]);
      }
    } catch (error) {
      console.error('Error loading watchlists:', error);
      setWatchlistError('Failed to load watchlists');
    } finally {
      setWatchlistLoading(false);
    }
  }, [widgetType]);

  useEffect(() => {
    if (!deferredOpen || widgetType !== 'watchlist') {
      return;
    }
    loadWatchlists();
  }, [deferredOpen, widgetType, loadWatchlists]);

  // Handle watchlist selection
  const handleWatchlistSelect = useCallback((watchlistId: string) => {
    const updatedSettings = {
      ...settings,
      watchlistId: watchlistId,
    };
    setSettings(updatedSettings);
    // Save settings and close slide-in menu
    onSave(updatedSettings);
    onClose();
  }, [settings, onSave, onClose]);

  // Handle watchlist creation
  const handleCreateWatchlistSetting = useCallback(async () => {
    const trimmed = newWatchlistSettingName.trim();
    if (!trimmed) {
      return;
    }
    try {
      setWatchlistError(null);
      
      // Get template ID from widgetPosition or settings
      const getTemplateId = (): number | null => {
        if (widgetPosition) {
          const templatePart = widgetPosition.split("-")[0];
          const parsed = parseInt(templatePart, 10);
          if (!isNaN(parsed) && parsed > 0) {
            return parsed;
          }
        }
        if (typeof window !== "undefined") {
          try {
            const storedActiveTemplateId = window.localStorage.getItem("pmt_active_template_id");
            if (storedActiveTemplateId) {
              const parsed = parseInt(storedActiveTemplateId, 10);
              if (!isNaN(parsed) && parsed > 0) {
                return parsed;
              }
            }
          } catch (storageError) {
            console.warn("Unable to read active template ID from localStorage", storageError);
          }
        }
        return null;
      };

      const templateId = getTemplateId();
      if (!templateId) {
        setWatchlistError('Template ID not found. Please save your template first.');
        return;
      }

      const result = await createWatchlistAndAddToDashboard({
        TemplateId: templateId,
        WatchlistName: trimmed,
        WidgetID: widgetInstanceId || widgetPosition,
        Color: "#FF5733",
        TopPos: 0,
        LeftPos: 0,
        Height: 200,
        Width: 300,
      });

      if (result.success && result.watchlistId) {
        setNewWatchlistSettingName('');
        setIsCreatingWatchlistSetting(false);
        await loadWatchlists();
        // Auto-select the newly created watchlist
        handleWatchlistSelect(result.watchlistId.toString());
      } else {
        throw new Error(result.error || result.message || 'Failed to create watchlist');
      }
    } catch (error) {
      console.error('Error creating watchlist:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create watchlist';
      setWatchlistError(errorMessage);
    }
  }, [newWatchlistSettingName, loadWatchlists, handleWatchlistSelect, widgetPosition, widgetInstanceId]);

  // Handle watchlist rename
  const handleRenameWatchlistSetting = useCallback(async () => {
    const trimmed = renameWatchlistSettingValue.trim();
    if (!trimmed || watchlistToDelete === null) {
      return;
    }
    try {
      setWatchlistError(null);
      const watchlistId = parseInt(watchlistToDelete, 10);
      if (isNaN(watchlistId)) {
        throw new Error('Invalid watchlist ID');
      }
      await updateWatchlist({
        WatchlistID: watchlistId,
        WatchlistName: trimmed,
        WidgetID: widgetInstanceId || widgetPosition,
      });
      setIsRenamingWatchlistSetting(false);
      setRenameWatchlistSettingValue('');
      setWatchlistToDelete(null);
      await loadWatchlists();
    } catch (error) {
      console.error('Error renaming watchlist:', error);
      setWatchlistError('Failed to rename watchlist');
    }
  }, [renameWatchlistSettingValue, watchlistToDelete, loadWatchlists, widgetPosition, widgetInstanceId]);

  // Handle watchlist deletion
  const handleDeleteWatchlistSetting = useCallback(async () => {
    if (watchlistToDelete === null) return;
    try {
      setIsDeletingWatchlist(true);
      setWatchlistError(null);
      
      const watchlistId = parseInt(watchlistToDelete, 10);
      if (isNaN(watchlistId)) {
        throw new Error('Invalid watchlist ID');
      }
      
      // Delete the watchlist (will delete all symbols if direct delete not available)
      await deleteWatchlist({
        WatchlistID: watchlistId,
        WidgetID: widgetInstanceId || widgetPosition,
      });
      
      // If deleted watchlist was selected, clear selection
      if (settings.watchlistId === watchlistToDelete || settings.watchlistId === watchlistId) {
        setSettings((prev) => {
          const updated = { ...prev };
          delete updated.watchlistId;
          return updated;
        });
      }
      
      setWatchlistToDelete(null);
      await loadWatchlists();
    } catch (error) {
      console.error('Error deleting watchlist:', error);
      setWatchlistError('Failed to delete watchlist');
    } finally {
      setIsDeletingWatchlist(false);
    }
  }, [watchlistToDelete, settings.watchlistId, loadWatchlists, widgetPosition, widgetInstanceId]);

  const requestDeleteWatchlistSetting = useCallback((watchlistId: string) => {
    setWatchlistToDelete(watchlistId);
  }, []);

  // Handle note title editing
  const handleStartEditingTitle = useCallback((noteId: number, currentTitle: string) => {
    setEditingNoteId(noteId);
    setEditingNoteTitle(currentTitle);
    setExpandedNoteId(null); // Close tags if open
  }, []);

  const handleSaveTitle = useCallback(async (noteId: number) => {
    if (!editingNoteTitle.trim()) {
      setEditingNoteId(null);
      setEditingNoteTitle('');
      return;
    }
    try {
      const note = notesOptions.find(n => n.ID === noteId);
      if (!note) return;
      
      await updateUserNoteTitleTags(noteId, editingNoteTitle.trim(), note.Tags || '');
      await loadNotes();
      setEditingNoteId(null);
      setEditingNoteTitle('');
    } catch (error) {
      console.error('Error updating note title:', error);
      setNotesError('Failed to update note title');
    }
  }, [editingNoteTitle, notesOptions, loadNotes]);

  // Handle tag management
  const handleAddTag = useCallback(async (noteId: number) => {
    if (!newTag.trim()) {
      setEditingTagsForNoteId(null);
      setNewTag('');
      return;
    }
    try {
      const note = notesOptions.find(n => n.ID === noteId);
      if (!note) return;
      
      const currentTags = note.Tags ? note.Tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      if (currentTags.includes(newTag.trim())) {
        setEditingTagsForNoteId(null);
        setNewTag('');
        return; // Tag already exists
      }
      
      const updatedTags = [...currentTags, newTag.trim()].join(',');
      await updateUserNoteTitleTags(noteId, note.NoteTitle, updatedTags);
      await loadNotes();
      setEditingTagsForNoteId(null);
      setNewTag('');
    } catch (error) {
      console.error('Error adding tag:', error);
      setNotesError('Failed to add tag');
    }
  }, [newTag, notesOptions, loadNotes]);

  const handleRemoveTag = useCallback(async (noteId: number, tagToRemove: string) => {
    try {
      const note = notesOptions.find(n => n.ID === noteId);
      if (!note) return;
      
      const currentTags = note.Tags ? note.Tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const updatedTags = currentTags.filter(t => t !== tagToRemove).join(',');
      await updateUserNoteTitleTags(noteId, note.NoteTitle, updatedTags);
      await loadNotes();
    } catch (error) {
      console.error('Error removing tag:', error);
      setNotesError('Failed to remove tag');
    }
  }, [notesOptions, loadNotes]);

  const handleMoodboardSelect = useCallback((boardId: string) => {
    setIsMoodboardCreating(false);
    setNewMoodboardName('');
    moodboardControllerRef.current?.selectBoard(boardId);
  }, []);

  const handleMoodboardCreate = useCallback(() => {
    const trimmed = newMoodboardName.trim();
    if (!trimmed) {
      return;
    }
    moodboardControllerRef.current?.createBoard(trimmed);
    setNewMoodboardName('');
    setIsMoodboardCreating(false);
  }, [newMoodboardName]);

  const handleMoodboardDelete = useCallback((boardId: string) => {
    moodboardControllerRef.current?.deleteBoard(boardId);
  }, []);

  // Fetch symbols from API when settings panel opens
  useEffect(() => {
    // Only fetch symbols for widgets that need them
    const needsSymbols = [
      'fx-volatility-levels',
      'distribution-chart',
      'volatility-statistics',
      'average-daily-range',
      'average-range-histogram',
      'range-probability',
      'distribution-stats',
      'news-sentiment',
      'gauge-overview',
      'price-chart',
      'information-chart',
      'supply-demand-areas',
      'supply-and-demand-areas',
      'high-low-points',
      'high-and-low-points',
      'session-ranges',
      'percent-monthly-targets',
      'quarter-movement',
      'position-book',
      'orderbook',
      'exponential-moving-average',
      'supertrend',
      'fx-bank-forecasts',
      'price-targets',
      'analyst-recommendations',
      'insider-transactions',
      'institutional-shareholders',
      'balance-sheet',
      'income-statement',
      'cash-flow-report',
      'seasonality-forecast',
      'seasonality-forecast-chart',
      'seasonality-forecast-table',
      'seasonality-performance-table',
      'seasonality-performance-chart',
      // Note: 'risk-reversals' uses hardcoded currency list, not API symbols
    ].includes(widgetType);

    if (!deferredOpen || !needsSymbols) {
      return;
    }

    // Check if this is a supply-demand-areas, high-low-points, or session-ranges widget
    const isSupplyDemandAreas = widgetType === 'supply-demand-areas' || widgetType === 'supply-and-demand-areas';
    const isHighLowPoints = widgetType === 'high-low-points' || widgetType === 'high-and-low-points';
    const isSessionRanges = widgetType === 'session-ranges';
    const isPercentMonthlyTargets = widgetType === 'percent-monthly-targets';
    const isQuarterMovement = widgetType === 'quarter-movement';

    // For news-sentiment, gauge-overview, price-chart, supply-demand-areas, high-low-points, price-targets, analyst-recommendations, insider-transactions, institutional-shareholders, balance-sheet, income-statement, cash-flow-report, seasonality-forecast, and seasonality-forecast-chart, use the module from settings, otherwise default to Forex
    // For analyst-recommendations, price-targets, insider-transactions, institutional-shareholders, balance-sheet, income-statement, and cash-flow-report, always use US Stocks
    // For seasonality-forecast, seasonality-forecast-chart, seasonality-forecast-table, seasonality-performance-table, and seasonality-performance-chart, use asset class from settings (map to module)
    // Note: dmx-positioning now uses hardcoded symbols per asset class (like dmx-chart), so it doesn't need API symbol fetching
    const ASSET_CLASS_TO_MODULE: Record<string, string> = {
      forex: "Forex",
      stocks: "US Stocks",
      crypto: "Crypto",
      commodities: "Commodities",
      indices: "Indices",
    };
    
    const isSeasonalityWidget = widgetType === 'seasonality-forecast' || widgetType === 'seasonality-forecast-chart' || widgetType === 'seasonality-forecast-table' || widgetType === 'seasonality-performance-table' || widgetType === 'seasonality-performance-chart';
    const isDistributionStatsWidget = widgetType === 'distribution-stats';
    const isRangeProbabilityWidget = widgetType === 'range-probability';
    const isDistributionChartWidget = widgetType === 'distribution-chart';
    const isAverageRangeHistogramWidget = widgetType === 'average-range-histogram';
    const seasonalityAssetClass = settings.assetClass || 'forex';
    const distributionStatsAssetClass = settings.assetClass || 'forex';
    const rangeProbabilityAssetClass = settings.assetClass || 'forex';
    const distributionChartAssetClass = settings.assetClass || 'forex';
    const averageRangeHistogramAssetClass = settings.assetClass || 'forex';
    const seasonalityModule = ASSET_CLASS_TO_MODULE[seasonalityAssetClass] || 'Forex';
    const distributionStatsModule = ASSET_CLASS_TO_MODULE[distributionStatsAssetClass] || 'Forex';
    const rangeProbabilityModule = ASSET_CLASS_TO_MODULE[rangeProbabilityAssetClass] || 'Forex';
    const distributionChartModule = ASSET_CLASS_TO_MODULE[distributionChartAssetClass] || 'Forex';
    const averageRangeHistogramModule = ASSET_CLASS_TO_MODULE[averageRangeHistogramAssetClass] || 'Forex';
    
    const widgetModule = (widgetType === 'analyst-recommendations' || widgetType === 'price-targets' || widgetType === 'insider-transactions' || widgetType === 'institutional-shareholders' || widgetType === 'balance-sheet' || widgetType === 'income-statement' || widgetType === 'cash-flow-report')
      ? 'US Stocks'
      : isSeasonalityWidget
        ? seasonalityModule
      : isDistributionStatsWidget
        ? distributionStatsModule
      : isRangeProbabilityWidget
        ? rangeProbabilityModule
      : isDistributionChartWidget
        ? distributionChartModule
      : isAverageRangeHistogramWidget
        ? averageRangeHistogramModule
      : (widgetType === 'news-sentiment' || widgetType === 'gauge-overview' || widgetType === 'price-chart' || widgetType === 'information-chart' || isSupplyDemandAreas || isHighLowPoints || isSessionRanges || isPercentMonthlyTargets || isQuarterMovement)
      ? (settings.module || 'Forex')
      : 'Forex';

    // For price-chart and information-chart with Forex module, use hardcoded symbols
    if ((widgetType === 'price-chart' || widgetType === 'information-chart') && widgetModule === 'Forex') {
      const FOREX_SYMBOLS = [
        'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
        'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
        'EURGBP', 'EURAUD', 'EURCAD', 'EURCHF', 'EURNZD',
        'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPNZD',
        'AUDCAD', 'AUDCHF', 'AUDNZD',
        'CADCHF', 'CADNZD', 'CHFNZD'
      ];
      if (availableSymbols.length === 0 || !availableSymbols.every(s => FOREX_SYMBOLS.includes(s))) {
        setAvailableSymbols(FOREX_SYMBOLS);
      }
      return;
    }

    // For supply-demand-areas, high-low-points, session-ranges, percent-monthly-targets, quarter-movement, and dmx-open-interest with Forex module, use hardcoded symbols (same as price-chart)
    if ((isSupplyDemandAreas || isHighLowPoints || isSessionRanges || isPercentMonthlyTargets || isQuarterMovement || widgetType === 'dmx-open-interest') && widgetModule === 'Forex') {
      const FOREX_SYMBOLS = [
        'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
        'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
        'EURGBP', 'EURAUD', 'EURCAD', 'EURCHF', 'EURNZD',
        'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPNZD',
        'AUDCAD', 'AUDCHF', 'AUDNZD',
        'CADCHF', 'CADNZD', 'CHFNZD'
      ];
      if (availableSymbols.length === 0 || !availableSymbols.every(s => FOREX_SYMBOLS.includes(s))) {
        setAvailableSymbols(FOREX_SYMBOLS);
      }
      return;
    }


    // For news-sentiment, gauge-overview, price-chart, information-chart, fx-bank-forecasts, supply-demand-areas, high-low-points, session-ranges, percent-monthly-targets, quarter-movement, price-targets, analyst-recommendations, insider-transactions, institutional-shareholders, balance-sheet, income-statement, and cash-flow-report, check if module changed - if so, we need to refetch
    // Note: price-targets, analyst-recommendations, insider-transactions, institutional-shareholders, balance-sheet, income-statement, and cash-flow-report always use US Stocks, so module won't change
    // Note: seasonality widgets use asset class from settings (mapped to module), so we need to check if asset class changed
    // Note: distribution-stats widget uses asset class from settings (mapped to module), so we need to check if asset class changed
    // Note: range-probability widget uses asset class from settings (mapped to module), so we need to check if asset class changed
    // Note: distribution-chart widget uses asset class from settings (mapped to module), so we need to check if asset class changed
    // Note: average-range-histogram widget uses asset class from settings (mapped to module), so we need to check if asset class changed
    // Note: dmx-positioning now uses hardcoded symbols per asset class (like dmx-chart), so it doesn't need API symbol fetching
    if (widgetType === 'news-sentiment' || widgetType === 'gauge-overview' || widgetType === 'price-chart' || widgetType === 'information-chart' || widgetType === 'fx-bank-forecasts' || isSupplyDemandAreas || isHighLowPoints || isSessionRanges || isPercentMonthlyTargets || isQuarterMovement || widgetType === 'price-targets' || widgetType === 'analyst-recommendations' || widgetType === 'insider-transactions' || widgetType === 'institutional-shareholders' || widgetType === 'balance-sheet' || widgetType === 'income-statement' || widgetType === 'cash-flow-report' || isSeasonalityWidget || isDistributionStatsWidget || isRangeProbabilityWidget || isDistributionChartWidget || isAverageRangeHistogramWidget) {
      if (lastFetchedModule === widgetModule && availableSymbols.length > 0) {
        // Same module and we have symbols, don't refetch
        return;
      }
    } else {
      // For other widgets, cache symbols if we already have them
      if (availableSymbols.length > 0) {
        return;
      }
    }

    const fetchSymbols = async () => {
      setSymbolsLoading(true);
      setSymbolsError(null);

      try {
        const response = await fetch('/api/pmt/get-symbols', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ Module: widgetModule }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch symbols: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.status !== 'success' || !Array.isArray(result.data)) {
          throw new Error('Invalid response from symbols API');
        }

        let fetchedSymbols = result.data.map((item: { Symbol: string }) => item.Symbol) || [];
        
        // For seasonality widgets and average-range-histogram with Indices module, filter out currency symbols (AUD, CAD, CHF, EUR, GBP, USD, JPY, NZD)
        // These are 3-letter currency codes that shouldn't be shown for indices
        if ((isSeasonalityWidget || isAverageRangeHistogramWidget) && widgetModule === 'Indices') {
          const currencySymbols = ['AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'USD', 'JPY', 'NZD'];
          fetchedSymbols = fetchedSymbols.filter((symbol: string) => !currencySymbols.includes(symbol));
        }
        
        setAvailableSymbols(fetchedSymbols);
        
        // Track the module we just fetched for news-sentiment, gauge-overview, price-chart, information-chart, fx-bank-forecasts, supply-demand-areas, high-low-points, session-ranges, percent-monthly-targets, quarter-movement, price-targets, analyst-recommendations, insider-transactions, institutional-shareholders, balance-sheet, income-statement, cash-flow-report, seasonality-forecast, seasonality-forecast-chart, distribution-stats, range-probability, distribution-chart, and average-range-histogram
        const needsForexSymbols = widgetType === 'supply-demand-areas' || widgetType === 'supply-and-demand-areas' || widgetType === 'high-low-points' || widgetType === 'high-and-low-points' || widgetType === 'session-ranges' || widgetType === 'percent-monthly-targets' || widgetType === 'quarter-movement' || widgetType === 'exponential-moving-average' || widgetType === 'supertrend';
        // Note: price-targets, analyst-recommendations, insider-transactions, institutional-shareholders, balance-sheet, income-statement, and cash-flow-report always use US Stocks
        // Note: seasonality-forecast, seasonality-forecast-chart, seasonality-forecast-table, seasonality-performance-table, and seasonality-performance-chart use asset class from settings (mapped to module)
        // Note: distribution-stats uses asset class from settings (mapped to module)
        // Note: range-probability uses asset class from settings (mapped to module)
        // Note: distribution-chart uses asset class from settings (mapped to module)
        // Note: average-range-histogram uses asset class from settings (mapped to module)
        // Note: dmx-positioning now uses hardcoded symbols per asset class (like dmx-chart), so it doesn't need API symbol fetching
        if (widgetType === 'news-sentiment' || widgetType === 'gauge-overview' || widgetType === 'price-chart' || widgetType === 'information-chart' || widgetType === 'fx-bank-forecasts' || needsForexSymbols || widgetType === 'price-targets' || widgetType === 'analyst-recommendations' || widgetType === 'insider-transactions' || widgetType === 'institutional-shareholders' || widgetType === 'balance-sheet' || widgetType === 'income-statement' || widgetType === 'cash-flow-report' || isSeasonalityWidget || isDistributionStatsWidget || isRangeProbabilityWidget || isDistributionChartWidget || isAverageRangeHistogramWidget) {
          setLastFetchedModule(widgetModule);
        }
        
        // For seasonality widgets, distribution-stats, range-probability, distribution-chart, and average-range-histogram, if no symbol is selected or current symbol is not in the new list, set the first one
        if ((isSeasonalityWidget || isDistributionStatsWidget || isRangeProbabilityWidget || isDistributionChartWidget || isAverageRangeHistogramWidget) && fetchedSymbols.length > 0) {
          const currentSymbol = settings.symbol;
          // If no symbol selected or current symbol not in fetched list, set first available
          if (!currentSymbol || !fetchedSymbols.includes(currentSymbol)) {
            setSettings({ ...settings, symbol: fetchedSymbols[0] });
          }
        }
        
        // For news-sentiment, if no symbol is selected or current symbol is not in the new list, set a default
        if (widgetType === 'news-sentiment' && fetchedSymbols.length > 0) {
          const currentSymbol = settings.symbols;
          // If no symbol selected or current symbol not in fetched list, set first available
          if (!currentSymbol || !fetchedSymbols.includes(currentSymbol)) {
            setSettings({ ...settings, symbols: fetchedSymbols[0] });
          }
        }
        
        // For gauge-overview, if no symbol is selected or current symbol is not in the new list, set a default
        if (widgetType === 'gauge-overview' && fetchedSymbols.length > 0) {
          const currentSymbol = settings.symbol;
          // If no symbol selected or current symbol not in fetched list, set first available
          if (!currentSymbol || !fetchedSymbols.includes(currentSymbol)) {
            setSettings({ ...settings, symbol: fetchedSymbols[0] });
          }
        }
        

        // For fx-bank-forecasts, if no symbol is selected or current symbol is not in the new list, set a default
        if (widgetType === 'fx-bank-forecasts' && fetchedSymbols.length > 0) {
          const currentSymbol = settings.symbol;
          // If no symbol selected or current symbol not in fetched list, set first available
          if (!currentSymbol || !fetchedSymbols.includes(currentSymbol)) {
            setSettings({ ...settings, symbol: fetchedSymbols[0] });
          }
        }
        
        // For price-targets, if no symbol is selected or current symbol is not in the new list, set a default
        if (widgetType === 'price-targets' && fetchedSymbols.length > 0) {
          const currentSymbol = settings.symbol;
          // If no symbol selected or current symbol not in fetched list, set first available
          if (!currentSymbol || !fetchedSymbols.includes(currentSymbol)) {
            setSettings({ ...settings, symbol: fetchedSymbols[0] });
          }
        }
        
        // For analyst-recommendations, if no symbol is selected or current symbol is not in the new list, set a default
        if (widgetType === 'analyst-recommendations' && fetchedSymbols.length > 0) {
          const currentSymbol = settings.symbol;
          // If no symbol selected or current symbol not in fetched list, set first available
          if (!currentSymbol || !fetchedSymbols.includes(currentSymbol)) {
            setSettings({ ...settings, symbol: fetchedSymbols[0] });
          }
        }
        
        // For insider-transactions, if no symbol is selected or current symbol is not in the new list, set a default
        if (widgetType === 'insider-transactions' && fetchedSymbols.length > 0) {
          const currentSymbol = settings.symbol;
          // If no symbol selected or current symbol not in fetched list, set first available
          if (!currentSymbol || !fetchedSymbols.includes(currentSymbol)) {
            setSettings({ ...settings, symbol: fetchedSymbols[0] });
          }
        }
        
        // For institutional-shareholders, if no symbol is selected or current symbol is not in the new list, set a default
        if (widgetType === 'institutional-shareholders' && fetchedSymbols.length > 0) {
          const currentSymbol = settings.symbol;
          // If no symbol selected or current symbol not in fetched list, set first available
          if (!currentSymbol || !fetchedSymbols.includes(currentSymbol)) {
            setSettings({ ...settings, symbol: fetchedSymbols[0] });
          }
        }
        
        // For balance-sheet, if no symbol is selected or current symbol is not in the new list, set a default
        if (widgetType === 'balance-sheet' && fetchedSymbols.length > 0) {
          const currentSymbol = settings.symbol;
          // If no symbol selected or current symbol not in fetched list, set first available
          if (!currentSymbol || !fetchedSymbols.includes(currentSymbol)) {
            setSettings({ ...settings, symbol: fetchedSymbols[0] });
          }
        }
        
        // For income-statement, if no symbol is selected or current symbol is not in the new list, set a default
        if (widgetType === 'income-statement' && fetchedSymbols.length > 0) {
          const currentSymbol = settings.symbol;
          // If no symbol selected or current symbol not in fetched list, set first available
          if (!currentSymbol || !fetchedSymbols.includes(currentSymbol)) {
            setSettings({ ...settings, symbol: fetchedSymbols[0] });
          }
        }
        
        // For cash-flow-report, if no symbol is selected or current symbol is not in the new list, set a default
        if (widgetType === 'cash-flow-report' && fetchedSymbols.length > 0) {
          const currentSymbol = settings.symbol;
          // If no symbol selected or current symbol not in fetched list, set first available
          if (!currentSymbol || !fetchedSymbols.includes(currentSymbol)) {
            setSettings({ ...settings, symbol: fetchedSymbols[0] });
          }
        }

        // For price-chart and information-chart, if no symbol is selected or current symbol is not in the new list, set a default
        if ((widgetType === 'price-chart' || widgetType === 'information-chart') && fetchedSymbols.length > 0) {
          const currentSymbol = settings.symbol;
          // If no symbol selected or current symbol not in fetched list, set first available
          if (!currentSymbol || !fetchedSymbols.includes(currentSymbol)) {
            setSettings({ ...settings, symbol: fetchedSymbols[0] });
          }
        }

        // For supply-demand-areas and high-low-points, if no symbol is selected or current symbol is not in the new list, set a default
        if (needsForexSymbols && fetchedSymbols.length > 0) {
          const currentSymbol = settings.symbol;
          // If no symbol selected or current symbol not in fetched list, set first available
          if (!currentSymbol || !fetchedSymbols.includes(currentSymbol)) {
            setSettings({ ...settings, symbol: fetchedSymbols[0] });
          }
        }
      } catch (err) {
        console.error('Error fetching symbols:', err);
        setSymbolsError(err instanceof Error ? err.message : 'Failed to load symbols');
        // Fallback to empty array - widgets will handle empty state
        setAvailableSymbols([]);
      } finally {
        setSymbolsLoading(false);
      }
    };

    fetchSymbols();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredOpen, widgetType, settings.module, settings.symbol, settings.assetClass]);

  // Reset symbols when panel closes (optional - allows fresh fetch on next open)
  useEffect(() => {
    if (!isOpen) {
      // Optionally reset symbols when panel closes
      // Commented out to cache symbols across panel opens
      // setAvailableSymbols([]);
    }
  }, [isOpen]);

  // Fetch dynamic dropdown data for Economic Data Charts
  // Countries and tabs (run once when widget opens)
  useEffect(() => {
    if (widgetType !== 'economic-data-charts') return;
    let cancelled = false;
    const run = async () => {
      try {
        const dd = await fetch('/api/pmt/macro-dropdown', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        if (!cancelled && dd.ok) {
          const j = await dd.json();
          const tabs = j?.data?.tabs || j?.data?.Tabs || [];
          const derived: string[] = Array.isArray(tabs)
            ? Array.from(new Set(
                tabs.flatMap((t: any) => Array.isArray(t?.events) ? t.events.map((e: any) => String(e?.country || '').trim()).filter(Boolean) : [])
              ))
            : [];
          const countries: string[] = (j?.data?.countries || j?.data?.Countries || j?.data?.country || derived).filter(Boolean);
          if (Array.isArray(countries) && countries.length > 0) {
            setEconCountries(countries);
            if (!econCountry) setEconCountry(countries[0]);
          }
        }
        const tabsResp = await fetch('/api/pmt/macro-tabs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        if (!cancelled && tabsResp.ok) {
          const j = await tabsResp.json();
          const tabs: string[] = j?.data?.tabnames || j?.data?.tabs || j?.data || [];
          if (Array.isArray(tabs) && tabs.length > 0) {
            setEconTabs(tabs);
            if (!econTab) setEconTab(tabs[0]);
          }
        }
      } catch {}
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetType]);

// Fetch symbols for DMX Statistics Table, DMX Open Interest, and DMX Positioning when asset class changes
useEffect(() => {
  if ((widgetType !== 'dmx-statistics-table' && widgetType !== 'dmx-open-interest' && widgetType !== 'dmx-positioning') || !deferredOpen) return;

    const ASSET_CLASS_TO_MODULE: Record<string, string> = {
      forex: "Forex",
      crypto: "Crypto",
      commodities: "Commodities",
      indices: "Indices",
    };

    const currentAssetClass = settings.assetClass || 'forex';
    const assetModule = ASSET_CLASS_TO_MODULE[currentAssetClass];
    if (!assetModule) {
      console.log(`[DMX Statistics] No module found for asset class: ${currentAssetClass}`);
      return;
    }

    // If we already have symbols for this asset class, don't fetch again
    // But if the array exists and is empty, it might be a failed fetch, so we should retry
    const existingSymbols = dmxSymbolsByAssetClass[currentAssetClass];
    if (existingSymbols && existingSymbols.length > 0) {
      console.log(`[DMX Statistics] Already have ${existingSymbols.length} symbols for ${currentAssetClass}, skipping fetch`);
      // Ensure first symbol is selected if no symbol is currently selected
      const currentSymbolValue = settings.symbol;
      if (!currentSymbolValue || !existingSymbols.includes(currentSymbolValue)) {
        setSettings({ ...settings, symbol: existingSymbols[0] });
      }
      return;
    }
    
    // If we're currently loading, don't start another fetch
    if (dmxSymbolsLoading[currentAssetClass]) {
      console.log(`[DMX Statistics] Already loading symbols for ${currentAssetClass}, skipping duplicate fetch`);
      return;
    }

    console.log(`[DMX Statistics] Fetching symbols for ${currentAssetClass} (module: ${assetModule})`);

    const formatSymbolForDisplay = (symbol: string, assetClass: string): string => {
      if (assetClass === 'forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
        // Forex pairs: EURUSD -> EUR/USD
        return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
      }
      // For US Stocks, keep the exchange prefix (e.g., "NASDAQ:AAPL")
      // For other asset classes, return as-is
      return symbol;
    };

    const fetchSymbols = async () => {
      setDmxSymbolsLoading(prev => ({ ...prev, [currentAssetClass]: true }));

      try {
        const response = await fetch('/api/pmt/get-symbols', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ Module: assetModule }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch symbols: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.status !== 'success' || !Array.isArray(result.data)) {
          throw new Error('Invalid response from symbols API');
        }

        const fetchedSymbols = result.data.map((item: { Symbol: string }) => item.Symbol) || [];
        // Format symbols for display and deduplicate
        const formattedSymbols = fetchedSymbols
          .map((s: string) => formatSymbolForDisplay(s, currentAssetClass))
          .filter((symbol: string) => symbol && symbol.length > 0) // Remove empty strings
          .filter((symbol: string, index: number, self: string[]) => self.indexOf(symbol) === index); // Remove duplicates

        console.log(`[DMX ${widgetType === 'dmx-open-interest' ? 'Open Interest' : widgetType === 'dmx-positioning' ? 'Positioning' : 'Statistics'}] Fetched ${fetchedSymbols.length} symbols for ${currentAssetClass}, formatted to ${formattedSymbols.length} symbols`);

        setDmxSymbolsByAssetClass(prev => ({
          ...prev,
          [currentAssetClass]: formattedSymbols,
        }));

        // Always select the first symbol from the list when symbols are loaded (for dmx-statistics-table and dmx-positioning)
        if ((widgetType === 'dmx-statistics-table' || widgetType === 'dmx-positioning') && formattedSymbols.length > 0) {
          const firstSymbol = formattedSymbols[0];
          setSettings({ ...settings, symbol: firstSymbol });
        }
      } catch (err) {
        console.error('Error fetching DMX symbols:', err);
        setDmxSymbolsByAssetClass(prev => ({
          ...prev,
          [currentAssetClass]: [],
        }));
      } finally {
        setDmxSymbolsLoading(prev => ({ ...prev, [currentAssetClass]: false }));
      }
    };

    fetchSymbols();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredOpen, widgetType, settings.assetClass]);

  // Events by selected tab/country
  useEffect(() => {
    if (widgetType !== 'economic-data-charts') return;
    if (!econTab || !econCountry) return;
    
    const key = `${econCountry.toLowerCase()}-${econTab.toLowerCase()}`;
    
    // Skip if we already have events for this country+tab
    if (fetchedEventsRef.current.has(key) && eventsByTab[key]) {
      console.log(`📊 [Settings] Already have events for ${key}, skipping fetch`);
      // Still update the dropdown with cached events
      const cached = eventsByTab[key];
      const ensured = (econIndicator && !cached.includes(econIndicator))
        ? [econIndicator, ...cached]
        : cached;
      setEconEvents(ensured);
      if (!econIndicator && ensured.length > 0) setEconIndicator(ensured[0]);
      return;
    }
    
    // Skip if already fetching this key
    if (fetchingEventsRef.current.has(key)) {
      console.log(`📊 [Settings] Already fetching events for ${key}, skipping`);
      return;
    }
    
    // Check if key changed
    if (prevCountryTabRef.current === key) {
      console.log(`📊 [Settings] Country+Tab unchanged (${key}), skipping fetch`);
      return;
    }
    
    prevCountryTabRef.current = key;
    fetchingEventsRef.current.add(key);
    const currentFetchingRef = fetchingEventsRef.current;
    let cancelled = false;
    
    const run = async () => {
      try {
        const resp = await fetch('/api/pmt/macro-events-by-tab', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tabname: econTab, country: econCountry })
        });
        if (!cancelled && resp.ok) {
          const j = await resp.json();
          const events: string[] = j?.data?.events?.map((e: any) => e?.eventName).filter(Boolean) || j?.data?.EventNames || j?.data || [];
          if (Array.isArray(events)) {
            // Cache the events
            setEventsByTab(prev => ({ ...prev, [key]: events }));
            fetchedEventsRef.current.add(key);
            
            // Ensure current indicator (possibly set via search) is present in the dropdown
            const ensured = (econIndicator && !events.includes(econIndicator))
              ? [econIndicator, ...events]
              : events;
            setEconEvents(ensured);
            if (!econIndicator && ensured.length > 0) setEconIndicator(ensured[0]);
          }
        }
      } catch (error) {
        console.error('❌ [Settings] Error fetching events:', error);
      } finally {
        fetchingEventsRef.current.delete(key);
      }
    };
    run();
    return () => { 
      cancelled = true;
      currentFetchingRef.delete(key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetType, econTab, econCountry]);

  // Prefetch events for ALL tabs for the selected country to power search (only once per country)
  useEffect(() => {
    if (widgetType !== 'economic-data-charts') return;
    if (!econCountry || !econTabs.length) return;
    
    const countryKey = econCountry.toLowerCase();
    
    // Skip if already prefetched for this country
    if (prefetchedCountriesRef.current.has(countryKey)) {
      console.log(`📊 [Settings] Already prefetched events for ${countryKey}, skipping`);
      return;
    }
    
    // Skip if already prefetching
    if (prefetchingRef.current) {
      console.log('📊 [Settings] Already prefetching, skipping');
      return;
    }
    
    prefetchingRef.current = true;
    let cancelled = false;
    
    const run = async () => {
      try {
        console.log(`📊 [Settings] Prefetching events for all tabs in ${countryKey}`);
        const entries = await Promise.all(
          econTabs.map(async (tab) => {
            const tabKey = `${countryKey}-${tab.toLowerCase()}`;
            // Skip if already fetched
            if (fetchedEventsRef.current.has(tabKey) || fetchingEventsRef.current.has(tabKey)) {
              return [tab, eventsByTab[tab] || []] as const;
            }
            
            fetchingEventsRef.current.add(tabKey);
            try {
              const resp = await fetch('/api/pmt/macro-events-by-tab', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tabname: tab, country: econCountry })
              });
              if (!resp.ok) {
                fetchingEventsRef.current.delete(tabKey);
                return [tab, [] as string[]] as const;
              }
              const j = await resp.json();
              const events: string[] = j?.data?.events?.map((e: any) => e?.eventName).filter(Boolean) || j?.data?.EventNames || j?.data || [];
              fetchedEventsRef.current.add(tabKey);
              fetchingEventsRef.current.delete(tabKey);
              return [tab, Array.isArray(events) ? events : []] as const;
            } catch (error) {
              console.error(`❌ [Settings] Error prefetching ${tabKey}:`, error);
              fetchingEventsRef.current.delete(tabKey);
              return [tab, [] as string[]] as const;
            }
          })
        );
        if (!cancelled) {
          const map: Record<string, string[]> = {};
          for (const [tab, evs] of entries) {
            const tabKey = `${countryKey}-${tab.toLowerCase()}`;
            map[tabKey] = evs;
          }
          setEventsByTab(prev => ({ ...prev, ...map }));
          prefetchedCountriesRef.current.add(countryKey);
        }
      } catch (error) {
        console.error('❌ [Settings] Error in prefetch:', error);
      } finally {
        prefetchingRef.current = false;
      }
    };
    run();
    return () => { 
      cancelled = true;
      prefetchingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetType, econCountry, econTabs.join('|')]);

  // Close search results when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!searchContainerRef.current) return;
      if (!searchContainerRef.current.contains(target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Global shortcut to focus search (Cmd/Ctrl+K)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        try { searchInputRef.current?.focus(); setShowSearchResults(true); } catch {}
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const Highlight = ({ text, q }: { text: string; q: string }) => {
    const query = q.trim();
    if (!query) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return (
      <span>
        {before}
        <mark className="bg-primary/20 text-foreground px-0.5">{match}</mark>
        {after}
      </span>
    );
  };

  // Ensure events for a country+tab are present in the global index (lazy fetch)
  const ensureCountryTabEvents = async (country: string, tab: string) => {
    try {
      if (eventsIndex[country]?.[tab]) return;
      const key = `${country}||${tab}`;
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      const resp = await fetch('/api/pmt/macro-events-by-tab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabname: tab, country })
      });
      if (!resp.ok) return;
      const j = await resp.json();
      const events: string[] = j?.data?.events?.map((e: any) => e?.eventName).filter(Boolean) || j?.data?.EventNames || j?.data || [];
      setEventsIndex(prev => {
        const next = { ...prev } as Record<string, Record<string, string[]>>;
        const forCountry = { ...(next[country] || {}) };
        forCountry[tab] = Array.isArray(events) ? events : [];
        next[country] = forCountry;
        return next;
      });
    } catch {}
    finally {
      try { inFlightRef.current.delete(`${country}||${tab}`); } catch {}
    }
  };

  const handleSave = () => {
    // Create a copy of settings to normalize before saving
    const normalizedSettings = { ...settings };
    
    // For DMX widgets, normalize symbol format by removing slashes
    // This ensures symbols are saved as "EURUSD" instead of "EUR/USD"
    if (widgetType === 'dmx-positioning' || widgetType === 'dmx-open-interest') {
      if (normalizedSettings.symbol && normalizedSettings.symbol.includes('/')) {
        normalizedSettings.symbol = normalizedSettings.symbol.replace('/', '');
      }
    }
    
    // For COT Chart View, ensure we preserve symbol and chartType from current settings
    if (widgetType === 'cot-chart-view') {
      normalizedSettings.symbol = normalizedSettings.symbol || currentSettings?.symbol || currentSettings?.cotCurrency || 'USD';
      normalizedSettings.chartType = normalizedSettings.chartType || currentSettings?.chartType || 'bar chart';
    }
    
    onSave(normalizedSettings);
    onClose();
  };



  const getWidgetIcon = () => {
    switch (widgetType) {
      case "news-dashboard":
      case "news-story":
        return <Newspaper className="w-4 h-4 text-primary" />;
      case "cot-positioning":
      case "cot-chart-view":
        return <BarChart3 className="w-4 h-4 text-primary" />;
      case "currency-strength":
        return <TrendingUp className="w-4 h-4 text-primary" />;
      case "risk-sentiment":
        return <Activity className="w-4 h-4 text-primary" />;
      case "risk-indicator":
        return <TrendingDown className="w-4 h-4 text-primary" />;
      case "news-ticker":
        return <Newspaper className="w-4 h-4 text-primary" />;
      case "realtime-headline-ticker":
        return <Newspaper className="w-4 h-4 text-primary" />;
      case "economic-calendar":
        return <Calendar className="w-4 h-4 text-primary" />;
      case "ticklist":
        return <ListChecks className="w-4 h-4 text-primary" />;
      case "seasonality-performance-chart":
        return <BarChart3 className="w-4 h-4 text-primary" />;
      case "seasonality-forecast-chart":
        return <BarChart3 className="w-4 h-4 text-primary" />;
      case "seasonality-forecast":
        return <BarChart3 className="w-4 h-4 text-primary" />;
      case "seasonality-forecast-table":
        return <BarChart3 className="w-4 h-4 text-primary" />;
      case "supply-demand-areas":
      case "supply-and-demand-areas":
      case "high-low-points":
      case "high-and-low-points":
      case "session-ranges":
      case "percent-monthly-targets":
      case "quarter-movement":
        return <BarChart3 className="w-4 h-4 text-primary" />;
      case "trading-chart":
      case "candlestick":
      case "line-chart":
      case "area-chart":
        return <TrendingUp className="w-4 h-4 text-primary" />;
      default:
        return <Settings2 className="w-4 h-4 text-primary" />;
    }
  };


  const renderSettingsContent = () => {
    // Normalize widgetType (handle template-saved names like 'fx-options-risk-reversals')
    const normalizedWidgetType = widgetType === 'fx-options-risk-reversals' ? 'risk-reversals' : widgetType;
    
    // Helper function to render currency pair selection
    const renderCurrencyPairSelection = (defaultSymbol: string, showRoundedNone = true, stripExchangePrefix = false) => {
      if (symbolsLoading) {
        return (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-muted-foreground">Loading currency pairs...</span>
          </div>
        );
      }

      if (symbolsError) {
        return (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-destructive">{symbolsError}</span>
          </div>
        );
      }

      if (availableSymbols.length === 0) {
        return (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-muted-foreground">No currency pairs available</span>
          </div>
        );
      }

      // Helper function to strip exchange prefix for display (e.g., "NASDAQ:AAPL" -> "AAPL")
      const formatSymbolForDisplay = (symbol: string): string => {
        if (!stripExchangePrefix) return symbol;
        // Remove exchange prefix (e.g., "NASDAQ:", "NYSE:", etc.)
        const parts = symbol.split(':');
        return parts.length > 1 ? parts[1] : symbol;
      };

      // Deduplicate symbols to avoid duplicate keys
      const uniqueSymbols = Array.from(new Set(availableSymbols));

      return (
        <div className="grid grid-cols-2 gap-2">
          {uniqueSymbols.map((symbol, index) => {
            const isSelected = (settings.symbol || defaultSymbol) === symbol;
            
            return (
              <button
                key={`${symbol}-${index}`}
                onClick={() => setSettings({ ...settings, symbol })}
                className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 ${showRoundedNone ? 'rounded-none' : ''} ${
                  isSelected
                    ? 'bg-primary/20 text-primary font-medium border-primary/50'
                    : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                }`}
              >
                <span>{formatSymbolForDisplay(symbol)}</span>
                {isSelected && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      );
    };

    // Helper function to render individual currency selection (for Risk Reversals)
    const renderCurrencySelection = (defaultCurrency: string, showRoundedNone = true) => {
      // Unique currencies extracted from currency pairs: AUD, CAD, CHF, EUR, GBP, JPY, NZD
      // Note: USD is excluded because risk reversals are measured for currencies against USD,
      // so USD risk reversals don't exist (you can't have USD risk reversals against itself)
      const currencies = ['AUD', 'CAD', 'CHF', 'EUR', 'GBP', 'JPY', 'NZD'];
      
      // Extract base currency from current symbol if it's a pair (e.g., "EURUSD" -> "EUR")
      const currentCurrency = settings.symbol 
        ? (settings.symbol.length > 3 ? settings.symbol.substring(0, 3).toUpperCase() : settings.symbol.toUpperCase())
        : (defaultCurrency.length > 3 ? defaultCurrency.substring(0, 3).toUpperCase() : defaultCurrency.toUpperCase());

      return (
        <div className="grid grid-cols-2 gap-2">
          {currencies.map((currency) => {
            const isSelected = currentCurrency === currency;
            
            return (
              <button
                key={currency}
                onClick={() => setSettings({ ...settings, symbol: currency })}
                className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 ${showRoundedNone ? 'rounded-none' : ''} ${
                  isSelected
                    ? 'bg-primary/20 text-primary font-medium border-primary/50'
                    : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                }`}
              >
                <span>{currency}</span>
                {isSelected && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      );
    };

    if (widgetType === 'moodboard') {
      const controller = moodboardControllerRef.current;
      const boards = moodboardState?.boards ?? [];
      const selectedMoodboardId = moodboardState?.selectedBoardId ?? '';

      if (!controller) {
        return (
          <div className="space-y-3">
            <Label className="text-sm text-foreground font-semibold">Moodboards</Label>
            <div className="text-sm text-muted-foreground">
              Open the Moodboard widget to manage boards.
            </div>
          </div>
        );
      }

      return (
    <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-foreground">Select Board</Label>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => setIsMoodboardCreating(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                New
              </Button>
            </div>

            {isMoodboardCreating && (
              <div className="space-y-2">
                <Input
                  value={newMoodboardName}
                  onChange={(event) => setNewMoodboardName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleMoodboardCreate();
                    }
                    if (event.key === 'Escape') {
                      setIsMoodboardCreating(false);
                      setNewMoodboardName('');
                    }
                  }}
                  placeholder="Moodboard name..."
                  className="h-8"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleMoodboardCreate}
                    disabled={!newMoodboardName.trim()}
                    className="h-7 px-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsMoodboardCreating(false);
                      setNewMoodboardName('');
                    }}
                    className="h-7 px-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {boards.length === 0 ? (
              <div className="text-sm text-muted-foreground">No moodboards available yet.</div>
            ) : (
              boards.map((board) => (
                <div
                  key={board.id}
                  className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                    selectedMoodboardId === board.id
                      ? 'bg-primary/20 text-primary border-primary'
                      : 'bg-widget-header/50 text-foreground hover:bg-widget-header border-transparent'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleMoodboardSelect(board.id)}
                    className="flex-1 text-left"
                  >
                    <span className="block text-sm truncate">{board.name}</span>
                  </button>
                  {boards.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleMoodboardDelete(board.id)}
                      title="Delete board"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (widgetType === 'exponential-moving-average') {
      const modules = ['Forex', 'Commodities', 'Indices'];
      const currentModule = settings.module || 'Forex';
      const currentSymbol = settings.symbol || 'EURUSD';
      const currentTimeframe = settings.timeframe || '1d';
      const currentDataType = settings.dataType || 'Retail';

      const timeframes = [
        { value: '4h', label: '4H' },
        { value: '1d', label: '1D' },
        { value: '1w', label: '1W' },
      ];

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
      const formatSymbolForDisplay = (symbol: string, module: string): string => {
        if (module === 'Forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        return symbol;
      };

      return (
        <div className="space-y-4">
          {/* Asset Class Selection */}
          {!isModuleLocked && (
            <>
              <div className="space-y-3">
                <Label className="text-sm text-foreground">Asset Class</Label>
                <div className="grid grid-cols-3 gap-2">
                  {modules.map((module) => (
                    <button
                      key={module}
                      onClick={() => {
                        setAvailableSymbols([]);
                        setLastFetchedModule(null);
                        setSettings({ ...settings, module: module, symbol: undefined });
                      }}
                      className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                        currentModule === module
                          ? 'bg-primary/20 text-primary font-medium border-primary/50'
                          : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                      }`}
                    >
                      <span>{module}</span>
                      {currentModule === module && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-border" />
            </>
          )}

          {/* Symbol Selection */}
          {!isSymbolLocked && (
            <>
              <div className="space-y-3">
                <Label className="text-sm text-foreground">Symbol</Label>
                {symbolsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading symbols...</div>
                ) : (
                  <Select
                    value={currentSymbol}
                    onValueChange={(value) => setSettings({ ...settings, symbol: value })}
                  >
                    <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                    className="max-h-[300px] rounded-none z-[10000]"
                      side="bottom"
                      sideOffset={4}
                      position="popper"
                      avoidCollisions={false}
                    >
                      {availableSymbols.map((sym) => {
                        const displaySymbol = formatSymbolForDisplay(sym, currentModule);
                        return (
                          <SelectItem 
                            key={sym} 
                            value={sym}
                            className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border"
                          >
                            {displaySymbol}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Separator className="bg-border" />
            </>
          )}

          {/* Timeframe Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Timeframe</Label>
            <div className="grid grid-cols-3 gap-2">
              {timeframes.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setSettings({ ...settings, timeframe: tf.value })}
                  className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                    currentTimeframe === tf.value
                      ? 'bg-primary/20 text-primary font-medium border-primary/50'
                      : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                  }`}
                >
                  <span>{tf.label}</span>
                  {currentTimeframe === tf.value && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Data Type */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Data Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {['Retail', 'Institutional'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSettings({ ...settings, dataType: type })}
                  className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                    currentDataType === type
                      ? 'bg-primary/20 text-primary font-medium border-primary/50'
                      : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                  }`}
                >
                  <span>{type}</span>
                  {currentDataType === type && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (widgetType === 'supertrend') {
      const modules = ['Forex', 'Commodities', 'Indices'];
      const currentModule = settings.module || 'Forex';
      const currentSymbol = settings.symbol || 'EURUSD';
      const currentTimeframe = settings.timeframe || '1d';

      const timeframes = [
        { value: '4h', label: '4H' },
        { value: '1d', label: '1D' },
        { value: '1w', label: '1W' },
      ];

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
      const formatSymbolForDisplay = (symbol: string, module: string): string => {
        if (module === 'Forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        return symbol;
      };

      return (
        <div className="space-y-4">
          {/* Asset Class Selection */}
          {!isModuleLocked && (
            <>
              <div className="space-y-3">
                <Label className="text-sm text-foreground">Asset Class</Label>
                <div className="grid grid-cols-3 gap-2">
                  {modules.map((module) => (
                    <button
                      key={module}
                      onClick={() => {
                        setAvailableSymbols([]);
                        setLastFetchedModule(null);
                        setSettings({ ...settings, module: module, symbol: undefined });
                      }}
                      className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                        currentModule === module
                          ? 'bg-primary/20 text-primary font-medium border-primary/50'
                          : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                      }`}
                    >
                      <span>{module}</span>
                      {currentModule === module && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-border" />
            </>
          )}

          {/* Symbol Selection */}
          {!isSymbolLocked && (
            <>
              <div className="space-y-3">
                <Label className="text-sm text-foreground">Symbol</Label>
                {symbolsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading symbols...</div>
                ) : (
                  <Select
                    value={currentSymbol}
                    onValueChange={(value) => setSettings({ ...settings, symbol: value })}
                  >
                    <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                    className="max-h-[300px] rounded-none z-[10000]"
                      side="bottom"
                      sideOffset={4}
                      position="popper"
                      avoidCollisions={false}
                    >
                      {availableSymbols.map((sym) => {
                        const displaySymbol = formatSymbolForDisplay(sym, currentModule);
                        return (
                          <SelectItem 
                            key={sym} 
                            value={sym}
                            className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border"
                          >
                            {displaySymbol}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Separator className="bg-border" />
            </>
          )}

          {/* Timeframe Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Timeframe</Label>
            <div className="grid grid-cols-3 gap-2">
              {timeframes.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setSettings({ ...settings, timeframe: tf.value })}
                  className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                    currentTimeframe === tf.value
                      ? 'bg-primary/20 text-primary font-medium border-primary/50'
                      : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                  }`}
                >
                  <span>{tf.label}</span>
                  {currentTimeframe === tf.value && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (widgetType === 'trading-journal') {
      const selectedJournalId = settings.journalID ? parseInt(String(settings.journalID), 10) : null;
      const getJournalLabel = (journal: JournalTitle) =>
        journal.Name || journal.JournalName || (journal.Title ? `Journal ${journal.Title}` : `Journal ${journal.ID}`);

      return (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm text-foreground">Select Journal</Label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={handleRefreshJournalSettings}
                  disabled={journalLoading}
                >
                  Refresh
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => setIsCreatingJournalSetting(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  New
                </Button>
              </div>
            </div>

            {isCreatingJournalSetting && (
              <div className="space-y-2 mb-3">
                <Input
                  value={newJournalSettingName}
                  onChange={(event) => setNewJournalSettingName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleCreateJournalSetting();
                    }
                    if (event.key === 'Escape') {
                      setIsCreatingJournalSetting(false);
                      setNewJournalSettingName('');
                    }
                  }}
                  placeholder="Journal name..."
                  className="h-8"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateJournalSetting}
                    disabled={!newJournalSettingName.trim()}
                    className="h-7 px-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreatingJournalSetting(false);
                      setNewJournalSettingName('');
                    }}
                    className="h-7 px-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {journalError && (
              <div className="text-sm text-destructive mb-2">
                {journalError}
              </div>
            )}

            {journalLoading ? (
              <div className="text-sm text-muted-foreground py-4">Loading journals...</div>
            ) : journalOptions.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">
                No journals found. Create one to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {journalOptions.map((journal) => {
      const journalId = getJournalIdFromTitle(journal);
      if (!journalId) return null;
      const isSelected = selectedJournalId === journalId;
      const isRenaming = isRenamingJournalSetting && selectedJournalId === journalId;
      return (
        <div
          key={journalId}
          className={`p-2 rounded border transition-colors ${
            isSelected
              ? 'bg-primary/20 text-primary border-primary'
              : 'bg-widget-header/50 text-foreground hover:bg-widget-header border-transparent'
          }`}
        >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleJournalSelect(journalId)}
                className="flex-1 text-left"
              >
                <span className="text-sm truncate block">{getJournalLabel(journal)}</span>
              </button>
              {isSelected ? (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => {
                      setIsRenamingJournalSetting(true);
                      const label = getJournalLabel(journal) || '';
                      setRenameJournalSettingValue(label);
                    }}
                    title="Rename journal"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => requestDeleteJournalSetting(journalId)}
                    disabled={journalLoading}
                    title="Delete journal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => requestDeleteJournalSetting(journalId)}
                  disabled={journalLoading}
                  title="Delete journal"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          {isRenaming && (
            <div className="mt-2 space-y-2">
              <Input
                value={renameJournalSettingValue}
                onChange={(event) => setRenameJournalSettingValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleRenameJournalSetting();
                  }
                  if (event.key === 'Escape') {
                    setIsRenamingJournalSetting(false);
                    setRenameJournalSettingValue('');
                  }
                }}
                placeholder="Rename journal..."
                className="h-8 text-foreground"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleRenameJournalSetting}
                  disabled={!renameJournalSettingValue.trim()}
                  className="h-7 px-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsRenamingJournalSetting(false);
                    setRenameJournalSettingValue('');
                  }}
                  className="h-7 px-2"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      );
    })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Notes Settings
    if (widgetType === 'notes') {
      const selectedNoteId = settings.noteID ? (typeof settings.noteID === 'string' ? parseInt(settings.noteID, 10) : settings.noteID) : null;

      return (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm text-foreground">Select Note</Label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => setIsCreatingNoteSetting(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  New
                </Button>
              </div>
            </div>

            {isCreatingNoteSetting && (
              <div className="space-y-2 mb-3">
                <Input
                  value={newNoteSettingName}
                  onChange={(event) => setNewNoteSettingName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleCreateNoteSetting();
                    }
                    if (event.key === 'Escape') {
                      setIsCreatingNoteSetting(false);
                      setNewNoteSettingName('');
                    }
                  }}
                  placeholder="Note title..."
                  className="h-8"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateNoteSetting}
                    disabled={!newNoteSettingName.trim()}
                    className="h-7 px-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreatingNoteSetting(false);
                      setNewNoteSettingName('');
                    }}
                    className="h-7 px-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {notesError && (
              <div className="text-sm text-destructive mb-2">
                {notesError}
              </div>
            )}

            {notesLoading ? (
              <div className="text-sm text-muted-foreground py-4">Loading notes...</div>
            ) : notesOptions.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">
                No notes found. Create one to get started.
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {notesOptions.map((note) => {
                  const isSelected = selectedNoteId === note.ID;
                  const noteTags = note.Tags ? note.Tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                  return (
                    <div key={note.ID} className="space-y-1">
                      <div
                        className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                          isSelected
                            ? 'bg-primary/20 text-primary border-primary'
                            : 'bg-widget-header/50 text-foreground hover:bg-widget-header border-transparent'
                        }`}
                      >
                        {editingNoteId === note.ID ? (
                          <div className="flex-1">
                            <Input
                              value={editingNoteTitle}
                              onChange={(e) => setEditingNoteTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle(note.ID);
                                if (e.key === 'Escape') {
                                  setEditingNoteId(null);
                                  setEditingNoteTitle('');
                                }
                              }}
                              placeholder="Note title..."
                              className="h-8"
                              autoFocus
                            />
                            <div className="flex gap-2 mt-1">
                              <Button
                                size="sm"
                                onClick={() => handleSaveTitle(note.ID)}
                                className="h-7 px-3 bg-primary hover:bg-primary/90"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditingNoteTitle('');
                                }}
                                className="h-7 px-2"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleNoteSelect(note.ID)}
                              className="flex-1 text-left"
                            >
                              <span className="text-sm truncate block">{note.NoteTitle}</span>
                            </button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedNoteId(expandedNoteId === note.ID ? null : note.ID);
                              }}
                              title="Manage tags"
                            >
                              <ChevronRight 
                                className={`w-3 h-3 transition-transform ${expandedNoteId === note.ID ? 'rotate-90' : ''}`} 
                              />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditingTitle(note.ID, note.NoteTitle);
                              }}
                              title="Edit title"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            {notesOptions.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestDeleteNoteSetting(note.ID);
                                }}
                                disabled={notesLoading}
                                title="Delete note"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Expandable Tags Section */}
                      {expandedNoteId === note.ID && (
                        <div className="ml-4 p-3 bg-background/50 border border-border/50 rounded space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Tags for this note</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => setEditingTagsForNoteId(note.ID)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add
                            </Button>
                          </div>

                          {editingTagsForNoteId === note.ID && (
                            <div className="space-y-2">
                              <Input
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddTag(note.ID);
                                  }
                                  if (e.key === 'Escape') {
                                    setEditingTagsForNoteId(null);
                                    setNewTag('');
                                  }
                                }}
                                placeholder="Tag name..."
                                className="h-7"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleAddTag(note.ID)}
                                  className="h-6 px-2 bg-primary hover:bg-primary/90"
                                >
                                  Add
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingTagsForNoteId(null);
                                    setNewTag('');
                                  }}
                                  className="h-6 px-2"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="space-y-1">
                            {noteTags.map((tag) => (
                              <div
                                key={tag}
                                className="flex items-center gap-2 p-1.5 rounded bg-widget-header/30 hover:bg-widget-header/50 transition-colors"
                              >
                                <Tag className="w-3 h-3 text-primary flex-shrink-0" />
                                <span className="text-xs truncate block flex-1">{tag}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleRemoveTag(note.ID, tag)}
                                  title="Remove tag"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </Button>
                              </div>
                            ))}
                            {noteTags.length === 0 && (
                              <p className="text-xs text-muted-foreground italic py-1">No tags</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Watchlist Settings
    if (widgetType === 'watchlist') {
      const selectedWatchlistId = settings.watchlistId ? String(settings.watchlistId) : null;

      return (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm text-foreground">Select Watchlist</Label>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => setIsCreatingWatchlistSetting(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                New
              </Button>
            </div>

            {isCreatingWatchlistSetting && (
              <div className="space-y-2 mb-3">
                <Input
                  value={newWatchlistSettingName}
                  onChange={(event) => setNewWatchlistSettingName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleCreateWatchlistSetting();
                    }
                    if (event.key === 'Escape') {
                      setIsCreatingWatchlistSetting(false);
                      setNewWatchlistSettingName('');
                    }
                  }}
                  placeholder="Watchlist name..."
                  className="h-8"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateWatchlistSetting}
                    disabled={!newWatchlistSettingName.trim()}
                    className="h-7 px-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreatingWatchlistSetting(false);
                      setNewWatchlistSettingName('');
                    }}
                    className="h-7 px-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {watchlistError && (
              <div className="text-sm text-destructive mb-2">
                {watchlistError}
              </div>
            )}

            {watchlistLoading ? (
              <div className="text-sm text-muted-foreground py-4">Loading watchlists...</div>
            ) : watchlistOptions.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">
                No watchlists found. Create one to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {/* FILTER: Hide watchlists with 0 symbols - can be removed later */}
                {watchlistOptions
                  .filter((watchlist) => (watchlist.Symbols?.length || 0) > 0)
                  .map((watchlist) => {
                  const watchlistId = watchlist.WatchlistID?.toString() || '';
                  const isSelected = selectedWatchlistId === watchlistId;
                  const symbolCount = watchlist.Symbols?.length || 0;
                  const isRenaming = isRenamingWatchlistSetting && selectedWatchlistId === watchlistId;
                  
                  return (
                    <div key={watchlistId} className="space-y-1">
                      <div
                        className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                          isSelected
                            ? 'bg-primary/20 text-primary border-primary'
                            : 'bg-widget-header/50 text-foreground hover:bg-widget-header border-transparent'
                        }`}
                      >
                        {isRenaming ? (
                          <div className="flex-1">
                            <Input
                              value={renameWatchlistSettingValue}
                              onChange={(event) => setRenameWatchlistSettingValue(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  handleRenameWatchlistSetting();
                                }
                                if (event.key === 'Escape') {
                                  setIsRenamingWatchlistSetting(false);
                                  setRenameWatchlistSettingValue('');
                                  setWatchlistToDelete(null);
                                }
                              }}
                              placeholder="Watchlist name..."
                              className="h-8"
                              autoFocus
                            />
                            <div className="flex gap-2 mt-1">
                              <Button
                                size="sm"
                                onClick={handleRenameWatchlistSetting}
                                disabled={!renameWatchlistSettingValue.trim()}
                                className="h-7 px-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setIsRenamingWatchlistSetting(false);
                                  setRenameWatchlistSettingValue('');
                                  setWatchlistToDelete(null);
                                }}
                                className="h-7 px-2"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleWatchlistSelect(watchlistId)}
                              className="flex-1 text-left"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: watchlist.Color || "#FF5733" }}
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm truncate block">{watchlist.WatchlistName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {symbolCount} {symbolCount === 1 ? 'symbol' : 'symbols'}
                                  </span>
                                </div>
                              </div>
                            </button>
                            {isSelected ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                                  onClick={() => {
                                    setIsRenamingWatchlistSetting(true);
                                    setRenameWatchlistSettingValue(watchlist.WatchlistName || '');
                                    setWatchlistToDelete(watchlistId);
                                  }}
                                  title="Rename watchlist"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </Button>
                                {watchlistOptions.length > 1 && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => requestDeleteWatchlistSetting(watchlistId)}
                                    disabled={watchlistLoading}
                                    title="Delete watchlist"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            ) : (
                              watchlistOptions.length > 1 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => requestDeleteWatchlistSetting(watchlistId)}
                                  disabled={watchlistLoading}
                                  title="Delete watchlist"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // FX Volatility Levels Settings
    if (widgetType === 'fx-volatility-levels') {
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            {/* Currency Selection - Individual buttons */}
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Currency Pair</Label>
              {renderCurrencyPairSelection("GBPUSD")}
            </div>
          </div>
        </div>
      );
    }

    // Position Book Settings
    if (widgetType === 'position-book') {
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            {/* Currency Selection - Individual buttons */}
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Currency Pair</Label>
              {renderCurrencyPairSelection("EURUSD")}
            </div>
          </div>
        </div>
      );
    }

    // Orderbook Settings
    if (widgetType === 'orderbook') {
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            {/* Currency Selection - Individual buttons */}
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Currency Pair</Label>
              {renderCurrencyPairSelection("EURUSD")}
            </div>
          </div>
        </div>
      );
    }
    
    // Distribution Chart Settings
    if (widgetType === 'distribution-chart') {

      const ASSET_CLASSES = [
        { value: "forex", label: "Forex" },
        { value: "stocks", label: "Stocks" },
        { value: "commodities", label: "Commodities" },
        { value: "indices", label: "Indices" },
      ];

      const currentAssetClass = settings.assetClass || 'forex';
      const defaultSymbol = currentAssetClass === 'forex' ? 'EURUSD' : (availableSymbols[0] || '');

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
      const formatSymbolForDisplay = (symbol: string): string => {
        if (currentAssetClass === 'forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          // Forex pairs: EURUSD -> EUR/USD
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        // For other asset classes, return as-is
        return symbol;
      };

      return (
        <div className="space-y-6">
          {/* Asset Class */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Asset Class</Label>
            <div className="flex flex-col gap-2">
              {ASSET_CLASSES.map((asset) => {
                const isActive = asset.value === currentAssetClass;
                return (
                  <button
                    key={asset.value}
                    type="button"
                    onClick={() => {
                      // When asset class changes, clear the symbol first
                      // The useEffect will fetch symbols and set the first one
                      setSettings({ ...settings, assetClass: asset.value, symbol: '' });
                    }}
                    className={cn(
                      "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <span>{asset.label}</span>
                    {isActive && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Symbol Selection - Grid Style */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Symbol</Label>
            {symbolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">Loading symbols...</span>
              </div>
            ) : symbolsError ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-destructive">{symbolsError}</span>
              </div>
            ) : availableSymbols.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">No symbols available for this asset class</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Array.from(new Set(availableSymbols)).map((symbol, index) => {
                  const isSelected = (settings.symbol || defaultSymbol) === symbol;
                  
                  return (
                    <button
                      key={`${symbol}-${index}`}
                      onClick={() => setSettings({ ...settings, symbol })}
                      className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                        isSelected
                          ? 'bg-primary/20 text-primary font-medium border-primary/50'
                          : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                      }`}
                    >
                      <span>{formatSymbolForDisplay(symbol)}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Volatility Statistics Settings
    if (widgetType === 'volatility-statistics') {
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            {/* Currency Pair Selection */}
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Currency Pair</Label>
              {renderCurrencyPairSelection("EURUSD")}
            </div>
          </div>
        </div>
      );
    }
    
    // Average Daily Range Settings
    if (widgetType === 'average-daily-range') {
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            {/* Currency Pair Selection */}
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Currency Pair</Label>
              {renderCurrencyPairSelection("EURUSD")}
            </div>
          </div>
        </div>
      );
    }
    
    // Average Range Histogram Settings
    if (widgetType === 'average-range-histogram') {

      const ASSET_CLASSES = [
        { value: "forex", label: "Forex" },
        { value: "stocks", label: "Stocks" },
        { value: "commodities", label: "Commodities" },
        { value: "indices", label: "Indices" },
      ];

      const currentAssetClass = settings.assetClass || 'forex';
      const defaultSymbol = currentAssetClass === 'forex' ? 'EURUSD' : (availableSymbols[0] || '');

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
      const formatSymbolForDisplay = (symbol: string): string => {
        if (currentAssetClass === 'forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          // Forex pairs: EURUSD -> EUR/USD
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        // For other asset classes, return as-is
        return symbol;
      };

      return (
        <div className="space-y-6">
          {/* Asset Class */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Asset Class</Label>
            <div className="flex flex-col gap-2">
              {ASSET_CLASSES.map((asset) => {
                const isActive = asset.value === currentAssetClass;
                return (
                  <button
                    key={asset.value}
                    type="button"
                    onClick={() => {
                      // When asset class changes, clear the symbol first
                      // The useEffect will fetch symbols and set the first one
                      setSettings({ ...settings, assetClass: asset.value, symbol: '' });
                    }}
                    className={cn(
                      "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <span>{asset.label}</span>
                    {isActive && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Symbol Selection - Grid Style */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Symbol</Label>
            {symbolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">Loading symbols...</span>
              </div>
            ) : symbolsError ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-destructive">{symbolsError}</span>
              </div>
            ) : availableSymbols.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">No symbols available for this asset class</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Array.from(new Set(availableSymbols)).map((symbol, index) => {
                  const isSelected = (settings.symbol || defaultSymbol) === symbol;
                  
                  return (
                    <button
                      key={`${symbol}-${index}`}
                      onClick={() => setSettings({ ...settings, symbol })}
                      className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                        isSelected
                          ? 'bg-primary/20 text-primary font-medium border-primary/50'
                          : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                      }`}
                    >
                      <span>{formatSymbolForDisplay(symbol)}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Range Probability Settings
    if (widgetType === 'range-probability') {

      const ASSET_CLASSES = [
        { value: "forex", label: "Forex" },
        { value: "stocks", label: "Stocks" },
        { value: "commodities", label: "Commodities" },
        { value: "indices", label: "Indices" },
      ];

      const currentAssetClass = settings.assetClass || 'forex';
      const defaultSymbol = currentAssetClass === 'forex' ? 'EURUSD' : (availableSymbols[0] || '');

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
      const formatSymbolForDisplay = (symbol: string): string => {
        if (currentAssetClass === 'forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          // Forex pairs: EURUSD -> EUR/USD
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        // For other asset classes, return as-is
        return symbol;
      };

      return (
        <div className="space-y-6">
          {/* Asset Class */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Asset Class</Label>
            <div className="flex flex-col gap-2">
              {ASSET_CLASSES.map((asset) => {
                const isActive = asset.value === currentAssetClass;
                return (
                  <button
                    key={asset.value}
                    type="button"
                    onClick={() => {
                      // When asset class changes, clear the symbol first
                      // The useEffect will fetch symbols and set the first one
                      setSettings({ ...settings, assetClass: asset.value, symbol: '' });
                    }}
                    className={cn(
                      "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <span>{asset.label}</span>
                    {isActive && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Symbol Selection - Grid Style */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Symbol</Label>
            {symbolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">Loading symbols...</span>
              </div>
            ) : symbolsError ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-destructive">{symbolsError}</span>
              </div>
            ) : availableSymbols.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">No symbols available for this asset class</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Array.from(new Set(availableSymbols)).map((symbol, index) => {
                  const isSelected = (settings.symbol || defaultSymbol) === symbol;
                  
                  return (
                    <button
                      key={`${symbol}-${index}`}
                      onClick={() => setSettings({ ...settings, symbol })}
                      className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                        isSelected
                          ? 'bg-primary/20 text-primary font-medium border-primary/50'
                          : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                      }`}
                    >
                      <span>{formatSymbolForDisplay(symbol)}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // Distribution Statistics Settings
    if (widgetType === 'distribution-stats') {

      const ASSET_CLASSES = [
        { value: "forex", label: "Forex" },
        { value: "stocks", label: "Stocks" },
        { value: "commodities", label: "Commodities" },
        { value: "indices", label: "Indices" },
      ];

      const currentAssetClass = settings.assetClass || 'forex';
      const defaultSymbol = currentAssetClass === 'forex' ? 'EURUSD' : (availableSymbols[0] || '');

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
      const formatSymbolForDisplay = (symbol: string): string => {
        if (currentAssetClass === 'forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          // Forex pairs: EURUSD -> EUR/USD
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        // For other asset classes, return as-is
        return symbol;
      };

      return (
        <div className="space-y-6">
          {/* Asset Class */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Asset Class</Label>
            <div className="flex flex-col gap-2">
              {ASSET_CLASSES.map((asset) => {
                const isActive = asset.value === currentAssetClass;
                return (
                  <button
                    key={asset.value}
                    type="button"
                    onClick={() => {
                      // When asset class changes, clear the symbol first
                      // The useEffect will fetch symbols and set the first one
                      setSettings({ ...settings, assetClass: asset.value, symbol: '' });
                    }}
                    className={cn(
                      "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <span>{asset.label}</span>
                    {isActive && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Symbol Selection - Grid Style */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Symbol</Label>
            {symbolsLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">Loading symbols...</span>
              </div>
            ) : symbolsError ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-destructive">{symbolsError}</span>
              </div>
            ) : availableSymbols.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-muted-foreground">No symbols available for this asset class</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Array.from(new Set(availableSymbols)).map((symbol, index) => {
                  const isSelected = (settings.symbol || defaultSymbol) === symbol;
                  
                  return (
                    <button
                      key={`${symbol}-${index}`}
                      onClick={() => setSettings({ ...settings, symbol })}
                      className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                        isSelected
                          ? 'bg-primary/20 text-primary font-medium border-primary/50'
                          : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                      }`}
                    >
                      <span>{formatSymbolForDisplay(symbol)}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // FX Bank Forecasts Settings - Symbol selection (Forex module by default)
    if (widgetType === 'fx-bank-forecasts') {
      const currentSymbol = settings.symbol || 'EURUSD';
      
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Currency Pair</Label>
            {renderCurrencyPairSelection(currentSymbol)}
          </div>
        </div>
      );
    }

    if (normalizedWidgetType === 'risk-reversals') {
      const selectedTimespan = settings.timespan || '10D';
      
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Currency</Label>
              {renderCurrencySelection("EUR", true)}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm text-foreground">Timespan</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: '5D', label: '5D' },
                  { value: '10D', label: '10D' },
                  { value: '1M', label: '1M' },
                  { value: 'All', label: 'All' },
                ].map((option) => {
                  const isSelected = selectedTimespan === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSettings({ ...settings, timespan: option.value })}
                      className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                        isSelected
                          ? 'bg-primary/20 text-primary font-medium border-primary/50'
                          : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                      }`}
                    >
                      <span>{option.label}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedTimespan === '5D' && 'Display the last 5 days'}
                {selectedTimespan === '10D' && 'Display the last 10 days'}
                {selectedTimespan === '1M' && 'Display the last 30 days'}
                {selectedTimespan === 'All' && 'Display all available data'}
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    if (widgetType === 'interest-rate-probability') {
      const selectedBank = settings.bankName || 'Federal Reserve';
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Central Bank</Label>
            <div className="flex flex-col gap-2">
              {CENTRAL_BANK_OPTIONS.map((bank) => {
                const isActive = bank === selectedBank;
                return (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSettings({ ...settings, bankName: bank })}
                    className={cn(
                      "flex w-full items-center justify-between border px-4 py-3 text-base transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border/60 bg-widget-header text-foreground hover:border-primary/40",
                    )}
                  >
                    <span>{bank}</span>
                    {isActive && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Choose which central bank’s meeting probabilities to display.
            </p>
          </div>
        </div>
      );
    }

    if (widgetType === 'implied-forward-curve') {
      const selectedSymbol = settings.symbol || 'USDOIS';
      return (
        <div className="space-y-4">
          <Label className="text-sm text-foreground">Symbol</Label>
          <div className="grid grid-cols-2 gap-2">
            {IMPLIED_FORWARD_SYMBOLS.map((symbol) => {
              const isActive = symbol === selectedSymbol;
              return (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => setSettings({ ...settings, symbol })}
                  className={cn(
                    "flex items-center justify-between border px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border/60 bg-widget-header text-foreground hover:border-primary/40"
                  )}
                >
                  <span>{symbol}</span>
                  {isActive && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Select which instrument feed to use for the implied forward curve.
          </p>
        </div>
      );
    }

    // Probability Table Settings
    if (widgetType === 'probability-table') {
      const currentSymbol = settings.symbol || 'FF_DISTR';

      const getSymbolLabel = (symbol: string) => {
        const labels: Record<string, string> = {
          'FF_DISTR': 'Federal Reserve',
          'ECB_OIS_DISTR': 'European Central Bank',
          'BOE_OIS_DISTR': 'Bank of England',
          'BOJ_OIS_DISTR': 'Bank of Japan',
          'BOC_OIS_DISTR': 'Bank of Canada',
          'RBA_OIS_DISTR': 'Reserve Bank of Australia',
          'RBNZ_OIS_DISTR': 'Reserve Bank of New Zealand',
          'SNB_OIS_DISTR': 'Swiss National Bank',
        };
        return labels[symbol] || symbol;
      };

      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Central Bank</Label>
            <div className="grid grid-cols-2 gap-2">
              {PROBABILITY_TABLE_SYMBOLS.map((symbol) => {
                const isActive = currentSymbol === symbol;
                return (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => setSettings({ ...settings, symbol })}
                    className={cn(
                      "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <span>{getSymbolLabel(symbol)}</span>
                    {isActive && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              Select which central bank probability distribution to display.
            </p>
          </div>
        </div>
      );
    }

    // Implied Forward Rates Settings
    if (widgetType === 'implied-forward-rates') {
      const selectedBank = settings.bankName || 'Federal Reserve';
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Central Bank</Label>
            <div className="grid grid-cols-2 gap-2">
              {CENTRAL_BANK_OPTIONS.map((bank) => {
                const isActive = bank === selectedBank;
                return (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => setSettings({ ...settings, bankName: bank })}
                    className={cn(
                      "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <span>{bank}</span>
                    {isActive && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              Select which central bank probability distribution to display.
            </p>
          </div>
        </div>
      );
    }

    // News Dashboard & News Story Settings
    if (widgetType === 'news-dashboard' || widgetType === 'news-story') {
      const displayMode = settings.newsDisplayMode || 'widget-slider';
      const MODES = [
        {
          value: 'widget-slider',
          title: 'Widget Slider',
          description: 'Slides in from left within the widget',
        },
        {
          value: 'fullscreen-slider',
          title: 'Fullscreen Slider',
          description: 'Slides in from left across entire screen',
        },
        {
          value: 'popup',
          title: 'Popup Dialog',
          description: 'Opens as a centered modal dialog',
        },
      ];

      const CATEGORY_OPTIONS = [
        { value: "all", label: "All Categories" },
        { value: "Stocks", label: "Stocks" },
        { value: "Commodities", label: "Commodities" },
        { value: "Forex", label: "Forex" },
        { value: "Politics", label: "Politics" },
        { value: "Housing", label: "Housing" },
        { value: "Energy", label: "Energy" },
        { value: "Technology", label: "Technology" },
        { value: "Corporate", label: "Corporate" },
        { value: "Economy", label: "Economy" },
        { value: "Government", label: "Government" },
        { value: "Natural Disasters", label: "Natural Disasters" },
        { value: "Industry", label: "Industry" },
        { value: "Inspirational", label: "Inspirational" },
        { value: "Law", label: "Law" },
        { value: "Military", label: "Military" },
        { value: "Society", label: "Society" },
        { value: "Transportation", label: "Transportation" },
        { value: "Conflict", label: "Conflict" },
        { value: "International", label: "International" },
        { value: "Crypto", label: "Crypto" },
        { value: "Sport", label: "Sport" },
      ];

      const isNewsStoryWidget = widgetType === 'news-story';
      const newsStoryFilter = settings.newsStoryFilter || 'all';

      return (
        <div className="space-y-6">
          <div className="space-y-1">
            <Label className="text-base font-semibold text-foreground">News Display Mode</Label>
            <p className="text-sm text-muted-foreground">
              Choose how news stories should open when clicked.
            </p>
          </div>

          <div className="space-y-2">
            {MODES.map((mode) => {
              const isActive = displayMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setSettings({ ...settings, newsDisplayMode: mode.value as WidgetSettings['newsDisplayMode'] })}
                  className={cn(
                    "w-full rounded border px-4 py-3 text-left transition-colors",
                    isActive
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-base font-medium">{mode.title}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{mode.description}</div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>

          {isNewsStoryWidget && (
            <>
              <Separator className="bg-border" />
              
              <div className="space-y-2">
                <Label className="text-base font-semibold text-foreground">Filter</Label>
                <p className="text-sm text-muted-foreground">
                  Choose which category the News Stories widget should display.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map(({ value, label }) => {
                    const isActive = newsStoryFilter === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSettings({ ...settings, newsStoryFilter: value })}
                        className={cn(
                          "rounded border px-3 py-2.5 text-base transition-colors text-left",
                          isActive
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                        )}
                      >
                        {label}
                        {isActive && <Check className="w-3 h-3 inline-block ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {!isNewsStoryWidget && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Category selection is controlled directly in the News Dashboard UI.
              </p>
            </div>
          )}
        </div>
      );
    }

    // Latest Stories Settings
    if (widgetType === 'latest-stories') {
      const displayMode = settings.newsDisplayMode || 'widget-slider';
      const sentimentValue = settings.latestStoriesSentiment;

      const MODES = [
        {
          value: 'widget-slider',
          title: 'Widget Slider',
          description: 'Slides in from left within the widget',
        },
        {
          value: 'fullscreen-slider',
          title: 'Fullscreen Slider',
          description: 'Slides in from left across entire screen',
        },
        {
          value: 'popup',
          title: 'Popup',
          description: 'Opens in a centered modal dialog',
        },
      ];

      const CATEGORY_OPTIONS = [
        { value: 'all', label: 'All Categories' },
        { value: 'Stocks', label: 'Stocks' },
        { value: 'Energy', label: 'Energy' },
        { value: 'Politics', label: 'Politics' },
        { value: 'Forex', label: 'Forex' },
        { value: 'Commodities', label: 'Commodities' },
        { value: 'Technology', label: 'Technology' },
        { value: 'Corporate', label: 'Corporate' },
        { value: 'Economy', label: 'Economy' },
        { value: 'Government', label: 'Government' },
        { value: 'Natural Disasters', label: 'Natural Disasters' },
        { value: 'Industry', label: 'Industry' },
        { value: 'Inspirational', label: 'Inspirational' },
        { value: 'Law', label: 'Law' },
        { value: 'Military', label: 'Military' },
        { value: 'Society', label: 'Society' },
        { value: 'Transportation', label: 'Transportation' },
        { value: 'Conflict', label: 'Conflict' },
        { value: 'International', label: 'International' },
        { value: 'Crypto', label: 'Crypto' },
        { value: 'Sport', label: 'Sport' },
      ];

      const SENTIMENT_OPTIONS = [
        { value: '', label: 'All Sentiments' },
        { value: 'Positive', label: 'Positive' },
        { value: 'Negative', label: 'Negative' },
        { value: 'Neutral', label: 'Neutral' },
      ];

      const handleCategoryToggle = (value: string, enabled: boolean) => {
        const current = new Set(settings.categories || CATEGORY_OPTIONS.map((option) => option.value));

        if (enabled) {
          current.add(value);
        } else {
          current.delete(value);
        }

        const normalized = CATEGORY_OPTIONS.map((option) => option.value).filter((val) =>
          current.has(val)
        );

        setSettings({
          ...settings,
          categories: normalized,
        });
      };

      const handleSentimentSelect = (value: string) => {
        if (!value) {
          const next = { ...settings };
          delete next.latestStoriesSentiment;
          setSettings(next);
          return;
        }
        setSettings({
          ...settings,
          latestStoriesSentiment: value as 'Positive' | 'Negative' | 'Neutral',
        });
      };


      return (
        <div className="space-y-6">
          <div className="space-y-1">
            <Label className="text-base font-semibold text-foreground">News Display Mode</Label>
            <p className="text-sm text-muted-foreground">
              Choose how news stories should open when clicked.
            </p>
          </div>

            <div className="space-y-2">
            {MODES.map((mode) => {
                const isActive = displayMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                  onClick={() => setSettings({ ...settings, newsDisplayMode: mode.value as WidgetSettings['newsDisplayMode'] })}
                    className={cn(
                      "w-full rounded border px-4 py-3 text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-base font-medium">{mode.title}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">{mode.description}</div>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-primary" />}
                    </div>
                  </button>
                );
              })}
          </div>

          <Separator className="bg-border/70" />

          <div className="space-y-2">
            <Label className="text-base font-semibold text-foreground">Categories</Label>
            <p className="text-sm text-muted-foreground">
              Toggle which Prime Market Terminal news categories should be included.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {CATEGORY_OPTIONS.map((option) => {
                const allSelected = !settings.categories || settings.categories.length === 0;
                const categorySet = new Set(settings.categories || []);
                const isEnabled =
                  option.value === 'all'
                    ? allSelected
                    : allSelected
                    ? true
                    : categorySet.has(option.value);

                return (
                  <div
                    key={option.value}
                    className="flex items-center justify-between rounded border border-border px-4 py-2.5"
                  >
                    <span className="text-base text-foreground">{option.label}</span>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => {
                        if (option.value === 'all') {
                          setSettings((prev) => {
                            const next = { ...prev };
                            delete next.categories;
                            return next;
                          });
                          return;
                        }
                        handleCategoryToggle(option.value, checked);
                      }}
                      className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border/70" />

          <div className="space-y-2">
            <Label className="text-base font-semibold text-foreground">Sentiment</Label>
            <p className="text-sm text-muted-foreground">
              Narrow results by story sentiment classification.
            </p>
            <div className="space-y-2">
              {SENTIMENT_OPTIONS.map((option) => {
                const isActive = (sentimentValue || '') === option.value;
                return (
                  <button
                    key={option.value || 'all-sentiment'}
                    type="button"
                    onClick={() => handleSentimentSelect(option.value)}
                    className={cn(
                      "w-full rounded border px-4 py-2.5 text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{option.label}</span>
                      {isActive && <Check className="w-4 h-4 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // Realtime Headline Ticker Settings
    if (widgetType === 'realtime-headline-ticker') {
      // Define all sections grouped by category
      const EQUITIES_SECTIONS = [
        { value: "DAX", label: "DAX" },
        { value: "CAC", label: "CAC" },
        { value: "SMI", label: "SMI" },
        { value: "US Equities", label: "US Equities" },
        { value: "Asian Equities", label: "Asian Equities" },
        { value: "FTSE 100", label: "FTSE 100" },
        { value: "European Equities", label: "European Equities" },
        { value: "Global Equities", label: "Global Equities" },
        { value: "UK Equities", label: "UK Equities" },
        { value: "EUROSTOXX", label: "EUROSTOXX" },
        { value: "US Equity Plus", label: "US Equity Plus" },
      ];

      const ECONOMIC_SECTIONS = [
        { value: "US Data", label: "US Data" },
        { value: "Swiss Data", label: "Swiss Data" },
        { value: "EU Data", label: "EU Data" },
        { value: "Canadian Data", label: "Canadian Data" },
        { value: "Other Data", label: "Other Data" },
        { value: "UK Data", label: "UK Data" },
      ];

      const CENTRAL_BANKS_SECTIONS = [
        { value: "Other Central Banks", label: "Other Central Banks" },
        { value: "BoC", label: "BoC" },
        { value: "RBNZ", label: "RBNZ" },
        { value: "RBA", label: "RBA" },
        { value: "SNB", label: "SNB" },
        { value: "BoJ", label: "BoJ" },
        { value: "BoE", label: "BoE" },
        { value: "ECB", label: "ECB" },
        { value: "PBoC", label: "PBoC" },
        { value: "Fed", label: "Fed" },
        { value: "Bank Research", label: "Bank Research" },
      ];

      const COMMENTARY_SECTIONS = [
        { value: "Fixed Income", label: "Fixed Income" },
        { value: "Geopolitical", label: "Geopolitical" },
        { value: "Rating Agency comments", label: "Rating Agency comments" },
        { value: "Global News", label: "Global News" },
        { value: "Market Analysis", label: "Market Analysis" },
        { value: "FX Flows", label: "FX Flows" },
        { value: "Asian News", label: "Asian News" },
        { value: "Economic Commentary", label: "Economic Commentary" },
        { value: "Brexit", label: "Brexit" },
        { value: "Energy & Power", label: "Energy & Power" },
        { value: "Metals", label: "Metals" },
        { value: "Ags & Softs", label: "Ags & Softs" },
        { value: "Crypto", label: "Crypto" },
        { value: "Emerging Markets", label: "Emerging Markets" },
        { value: "US Election", label: "US Election" },
        { value: "Trade", label: "Trade" },
      ];

      const PMT_UPDATE_SECTIONS = [
        { value: "Newsquawk Update", label: "PMT Update" },
      ];

      const PRIORITY_SECTIONS = [
        { value: "Important", label: "Important" },
        { value: "Rumour", label: "Rumour" },
        { value: "Highlighted", label: "Highlighted" },
        { value: "Normal", label: "Normal News" },
      ];

      // Combine all sections for "Select All" functionality
      const ALL_SECTIONS = [
        ...EQUITIES_SECTIONS,
        ...ECONOMIC_SECTIONS,
        ...CENTRAL_BANKS_SECTIONS,
        ...COMMENTARY_SECTIONS,
        ...PMT_UPDATE_SECTIONS,
      ];

      const ALL_SECTION_VALUES = ALL_SECTIONS.map(s => s.value);
      const ALL_PRIORITY_VALUES = PRIORITY_SECTIONS.map(p => p.value);

      // Get current selections (default to all selected using the shared constants)
      // Important: respect empty arrays as "nothing selected", not "use defaults"
      const selectedSections = new Set(
        settings.newsSections !== undefined
          ? settings.newsSections
          : REALTIME_NEWS_DEFAULT_SECTIONS
      );
      const selectedPriorities = new Set(
        settings.newsPriorities !== undefined
          ? settings.newsPriorities
          : REALTIME_NEWS_DEFAULT_PRIORITIES
      );

      const allSectionsSelected = ALL_SECTION_VALUES.every(v => selectedSections.has(v));
      const allPrioritiesSelected = ALL_PRIORITY_VALUES.every(v => selectedPriorities.has(v));
      const selectAllChecked = allSectionsSelected && allPrioritiesSelected;

      const handleSectionToggle = (value: string, enabled: boolean) => {
        const newSections = new Set(selectedSections);
        if (enabled) {
          newSections.add(value);
        } else {
          newSections.delete(value);
        }
        const updatedSettings = {
          ...settings,
          newsSections: Array.from(newSections),
        };
        setSettings(updatedSettings);
        // Save immediately on change
        onSave(updatedSettings);
      };

      const handlePriorityToggle = (value: string, enabled: boolean) => {
        const newPriorities = new Set(selectedPriorities);
        if (enabled) {
          newPriorities.add(value);
        } else {
          newPriorities.delete(value);
        }
        const updatedSettings = {
          ...settings,
          newsPriorities: Array.from(newPriorities),
        };
        setSettings(updatedSettings);
        // Save immediately on change
        onSave(updatedSettings);
      };

      const handleSelectAll = (checked: boolean) => {
        // When toggled on, select all; when toggled off, uncheck all
        const updatedSettings = checked
          ? {
              ...settings,
              newsSections: [...REALTIME_NEWS_DEFAULT_SECTIONS],
              newsPriorities: [...REALTIME_NEWS_DEFAULT_PRIORITIES],
            }
          : {
              ...settings,
              newsSections: [],
              newsPriorities: [],
            };
        setSettings(updatedSettings);
        // Save immediately on change
        onSave(updatedSettings);
      };

      const renderSectionGroup = (title: string, sections: { value: string; label: string }[]) => (
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">{title}</Label>
          <div className="space-y-1">
            {sections.map((section) => (
              <div
                key={section.value}
                className="flex items-center justify-between rounded border border-border px-3 py-2"
              >
                <span className="text-sm text-foreground">{section.label}</span>
                <Checkbox
                  checked={selectedSections.has(section.value)}
                  onCheckedChange={(checked) => handleSectionToggle(section.value, !!checked)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>
            ))}
          </div>
        </div>
      );

      return (
        <div className="space-y-6">
          {/* Select All Toggle - Radio button style */}
          <div className="flex items-center justify-between rounded border border-primary/50 bg-primary/5 px-4 py-3">
            <div className="flex flex-col">
              <span className="text-base font-semibold text-foreground">Select All</span>
              <span className="text-xs text-muted-foreground">Toggle all filters on/off</span>
            </div>
            <Switch
              checked={selectAllChecked}
              onCheckedChange={handleSelectAll}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <Separator className="bg-border/70" />

          {/* News Sections (Priorities) */}
          <div className="space-y-2">
            <Label className="text-base font-semibold text-foreground">News Sections</Label>
            <p className="text-sm text-muted-foreground">
              Filter by news priority and type.
            </p>
            <div className="space-y-1">
              {PRIORITY_SECTIONS.map((priority) => (
                <div
                  key={priority.value}
                  className="flex items-center justify-between rounded border border-border px-3 py-2"
                >
                  <span className="text-sm text-foreground">{priority.label}</span>
                  <Checkbox
                    checked={selectedPriorities.has(priority.value)}
                    onCheckedChange={(checked) => handlePriorityToggle(priority.value, !!checked)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-border/70" />

          {/* Two Column Layout for Categories */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              {renderSectionGroup("Equities", EQUITIES_SECTIONS)}
              {renderSectionGroup("Economic Releases", ECONOMIC_SECTIONS)}
              {renderSectionGroup("Central Banks", CENTRAL_BANKS_SECTIONS)}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {renderSectionGroup("News Commentary", COMMENTARY_SECTIONS)}
              {renderSectionGroup("PMT Update", PMT_UPDATE_SECTIONS)}
            </div>
          </div>
        </div>
      );
    }

    // DMX Chart Settings
    if (widgetType === 'dmx-chart') {
      const ASSET_CLASSES = [
        { value: "forex", label: "Forex", symbols: ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "NZD/USD", "AUD/JPY"] },
        { value: "commodities", label: "Commodities", symbols: ["XAUUSD", "XAGUSD", "USOIL", "UKOIL", "XPTUSD", "XPDUSD"] },
        { value: "indices", label: "Indices", symbols: ["SPX500", "NAS100", "DJI", "DAX40", "FTSE100", "NIKKEI225", "HK50"] },
      ];

      const CHART_TYPES = [
        { value: "bar", label: "Bar" },
        { value: "line", label: "Line" },
        { value: "stacked", label: "Stacked Bars" },
      ];

      const DATA_TYPES = [
        { value: "positions", label: "Positions" },
        { value: "percentage", label: "Percentage" },
        { value: "open-interest", label: "Open Interest" },
        { value: "open-positions", label: "Open Positions" },
        { value: "position-ratio", label: "Position Ratio" },
      ];

      const TIME_FRAMES = [
        { value: "monthly", label: "Monthly" },
        { value: "daily", label: "Daily" },
        { value: "4h", label: "Every 4 Hours" },
        { value: "1h", label: "Every Hour" },
      ];

      const currentAssetClass = settings.assetClass || "forex";
      const assetEntry = ASSET_CLASSES.find((entry) => entry.value === currentAssetClass) || ASSET_CLASSES[0];
      const symbolOptions = assetEntry.symbols;
      const currentSymbol =
        settings.symbol && symbolOptions.includes(settings.symbol)
          ? settings.symbol
          : symbolOptions[0] || "";
      const currentChartType = settings.chartType || "stacked";
      const currentDataType = settings.dataType || "percentage";
      const currentTimeFrame = settings.timeFrame || "daily";

      const formatSymbolLabel = (symbol: string): string => {
        if (symbol.includes("/")) return symbol;
        if (/^[A-Z]{6}$/.test(symbol)) {
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        return symbol;
      };

      return (
        <div className="space-y-6">
          {/* Asset Class */}
          {!isModuleLocked && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-semibold text-foreground">Asset Class</Label>
                <div className="flex flex-col gap-2">
                  {ASSET_CLASSES.map((asset) => {
                    const isActive = asset.value === currentAssetClass;
                    return (
                      <button
                        key={asset.value}
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            assetClass: asset.value,
                            symbol: asset.symbols[0] || "",
                      })
                    }
                    className={cn(
                      "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <span>{asset.label}</span>
                    {isActive && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border" />
            </>
          )}

          {/* Symbol */}
          {!isSymbolLocked && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-semibold text-foreground">Symbol</Label>
                <Select
                  value={currentSymbol}
                  onValueChange={(value) => setSettings({ ...settings, symbol: value })}
                >
                  <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                    <SelectValue placeholder="Select a symbol" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                    {symbolOptions.map((symbol) => (
                      <SelectItem
                        key={symbol}
                        value={symbol}
                        className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border"
                      >
                        {formatSymbolLabel(symbol)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-border" />
            </>
          )}

          {/* Time Frame */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Time Frame</Label>
            <div className="flex flex-col gap-2">
              {TIME_FRAMES.map((frame) => {
                const isActive = frame.value === currentTimeFrame;
                return (
                  <button
                    key={frame.value}
                    type="button"
                    onClick={() => setSettings({ ...settings, timeFrame: frame.value })}
                    className={cn(
                      "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <span>{frame.label}</span>
                    {isActive && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Chart Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Chart Type</Label>
            <div className="flex flex-col gap-2">
              {CHART_TYPES.map((type) => {
                const isActive = type.value === currentChartType;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSettings({ ...settings, chartType: type.value })}
                    className={cn(
                      "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <span>{type.label}</span>
                    {isActive && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Data Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Data Type</Label>
            <div className="flex flex-col gap-2">
              {DATA_TYPES.map((type) => {
                const isActive = type.value === currentDataType;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSettings({ ...settings, dataType: type.value })}
                    className={cn(
                      "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <span>{type.label}</span>
                    {isActive && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // DMX Statistics Table Settings
    if (widgetType === 'dmx-statistics-table') {
      // Map asset classes to API module names

      const ASSET_CLASSES = [
        { value: "forex", label: "Forex" },
        { value: "crypto", label: "Crypto" },
        { value: "commodities", label: "Commodities" },
        { value: "indices", label: "Indices" },
      ];

      const currentAssetClass = settings.assetClass || 'forex';
      const currentSymbols = dmxSymbolsByAssetClass[currentAssetClass] || [];
      const isLoading = dmxSymbolsLoading[currentAssetClass] || false;
      const currentSymbol = settings.symbol || currentSymbols[0] || '';

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)


      return (
        <div className="space-y-6">
          {/* Asset Class */}
          {!isModuleLocked && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-semibold text-foreground">Asset Class</Label>
                <div className="flex flex-col gap-2">
                  {ASSET_CLASSES.map((asset) => {
                    const isActive = asset.value === currentAssetClass;
                    return (
                      <button
                        key={asset.value}
                        type="button"
                        onClick={() => {
                          // When asset class changes, clear the symbol first
                          // The useEffect will fetch symbols and set the first one
                          setSettings({ ...settings, assetClass: asset.value, symbol: '' });
                        }}
                        className={cn(
                          "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                          isActive
                            ? "border-primary bg-primary/10 text-foreground font-semibold"
                            : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                        )}
                      >
                        <span>{asset.label}</span>
                        {isActive && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-border" />
            </>
          )}

          {/* Symbol */}
          {!isSymbolLocked && (
            <div className="space-y-3">
              <Label className="text-base font-semibold text-foreground">Symbol</Label>
              {isLoading ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  Loading symbols...
                </div>
              ) : currentSymbols.length === 0 ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  No symbols available for this asset class
                </div>
              ) : (
                <Select
                  value={currentSymbol || ''}
                  onValueChange={(value) => setSettings({ ...settings, symbol: value })}
                >
                  <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                    <SelectValue placeholder="Select a symbol" />
                  </SelectTrigger>
                  <SelectContent 
                    className="max-h-[300px] rounded-none z-[10000]"
                    side="bottom"
                    sideOffset={4}
                    position="popper"
                    avoidCollisions={false}
                  >
                    {currentSymbols.map((symbol, index) => (
                      <SelectItem 
                        key={`${symbol}-${index}`} 
                        value={symbol}
                        className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border"
                      >
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      );
    }

    // DMX Overview Settings
    if (widgetType === 'dmx-overview') {
      const ASSET_CLASSES = [
        { value: "forex", label: "Forex" },
        { value: "crypto", label: "Crypto" },
        { value: "commodities", label: "Commodities" },
        { value: "indices", label: "Indices" },
      ];

      const TIME_FRAMES = [
        { value: "monthly", label: "Every Month" },
        { value: "daily", label: "Every Day" },
        { value: "4h", label: "Every 4 Hours" },
        { value: "1h", label: "Every Hour" },
      ];

      const currentAssetClass = settings.assetClass || 'forex';
      const currentTimeFrame = settings.timeFrame || '1h';

      return (
        <div className="space-y-6">
          {/* Asset Class */}
          {!isModuleLocked && (
            <div className="space-y-3">
              <Label className="text-base font-semibold text-foreground">Asset Class</Label>
              <div className="flex flex-col gap-2">
                {ASSET_CLASSES.map((asset) => {
                  const isActive = asset.value === currentAssetClass;
                  return (
                    <button
                      key={asset.value}
                      type="button"
                      onClick={() => setSettings({ ...settings, assetClass: asset.value })}
                      className={cn(
                        "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                        isActive
                          ? "border-primary bg-primary/10 text-foreground font-semibold"
                          : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                      )}
                    >
                      <span>{asset.label}</span>
                      {isActive && <Check className="w-5 h-5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Separator className="bg-border" />

          {/* Time Frame */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Time Frame</Label>
            <div className="flex flex-col gap-2">
              {TIME_FRAMES.map((frame) => {
                const isActive = frame.value === currentTimeFrame;
                return (
                  <button
                    key={frame.value}
                    type="button"
                    onClick={() => setSettings({ ...settings, timeFrame: frame.value })}
                    className={cn(
                      "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <span>{frame.label}</span>
                    {isActive && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // DMX Open Interest Settings
    if (widgetType === 'dmx-open-interest') {
      const TIME_FRAMES = [
        { value: "monthly", label: "Monthly" },
        { value: "daily", label: "Daily" },
        { value: "4h", label: "4 Hours" },
        { value: "1h", label: "Hour" },
      ];

      // Always use forex as default
      const currentAssetClass = 'forex';
      const currentTimeFrame = settings.timeFrame || 'daily';
      const currentBaseCurrency = settings.baseCurrency || 'XXX';
      const currentQuoteCurrency = settings.quoteCurrency || 'USD';

      // Ensure assetClass is set to forex in settings
      if (settings.assetClass !== 'forex') {
        setSettings({ ...settings, assetClass: 'forex' });
      }

      const currentFilterMode = settings.filterMode || 'all';
      const QUOTE_CURRENCIES_FOR_FILTER = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];
      const BASE_CURRENCIES_FOR_FILTER = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];

      // Get display label for current filter mode
      const getFilterLabel = (mode: string): string => {
        // If a specific currency pair is selected (both base and quote are not XXX), show the pair
        if (currentBaseCurrency !== 'XXX' && currentQuoteCurrency !== 'XXX') {
          return `${currentBaseCurrency} / ${currentQuoteCurrency}`;
        }
        
        // Otherwise, show the filter mode label
        switch (mode) {
          case "all": return "All";
          case "top5-short": return "TOP 5 Short";
          case "top5-long": return "TOP 5 Long";
          case "top10-short": return "TOP 10 Short";
          case "top10-long": return "TOP 10 Long";
          default:
            if (mode.startsWith('XXX')) {
              return `XXX / ${mode.substring(3)}`;
            }
            if (mode.endsWith('XXX')) {
              return `${mode.substring(0, 3)} / XXX`;
            }
            return mode;
        }
      };

      return (
        <div className="space-y-6">
          {/* Filter Mode Dropdown */}
          {!isModuleLocked && (
            <>
              <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Filter</Label>
            <Select
              value={currentFilterMode}
              onValueChange={(value) => {
                // When filter dropdown is selected, clear currency pair selection
                if (value.startsWith('XXX')) {
                  const quote = value.substring(3);
                  setSettings({ 
                    ...settings, 
                    filterMode: value, 
                    baseCurrency: 'XXX', 
                    quoteCurrency: quote 
                  });
                } else if (value.endsWith('XXX')) {
                  const base = value.substring(0, 3);
                  setSettings({ 
                    ...settings, 
                    filterMode: value, 
                    baseCurrency: base, 
                    quoteCurrency: 'XXX' 
                  });
                } else {
                  // For 'all' or top N filters, clear currency pair selection
                  setSettings({ 
                    ...settings, 
                    filterMode: value,
                    baseCurrency: 'XXX',
                    quoteCurrency: 'XXX'
                  });
                }
              }}
            >
              <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                <SelectValue>{getFilterLabel(currentFilterMode)}</SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                <ScrollArea className="max-h-[400px]">
                  {/* All */}
                  <SelectItem value="all" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                    All
                  </SelectItem>

                  {/* TOP 5 Short */}
                  <SelectItem value="top5-short" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                    TOP 5 Short
                  </SelectItem>

                  {/* TOP 5 Long */}
                  <SelectItem value="top5-long" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                    TOP 5 Long
                  </SelectItem>

                  {/* TOP 10 Short */}
                  <SelectItem value="top10-short" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                    TOP 10 Short
                  </SelectItem>

                  {/* TOP 10 Long */}
                  <SelectItem value="top10-long" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                    TOP 10 Long
                  </SelectItem>

                  {/* Separator */}
                  <div className="my-2 border-t border-border" />

                  {/* XXX / Quote Currency Options */}
                  {QUOTE_CURRENCIES_FOR_FILTER.map((quote) => {
                    const filterValue = `XXX${quote}`;
                    return (
                      <SelectItem key={filterValue} value={filterValue} className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                        XXX / {quote}
                      </SelectItem>
                );
              })}

                  {/* Base Currency / XXX Options */}
                  {BASE_CURRENCIES_FOR_FILTER.map((base) => {
                    const filterValue = `${base}XXX`;
                    return (
                      <SelectItem key={filterValue} value={filterValue} className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                        {base} / XXX
                      </SelectItem>
                    );
                  })}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-border" />
            </>
          )}

          {/* Currency Pair Selection */}
          {!isSymbolLocked && (
            <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Currency Pair</Label>
            {(() => {
              // Build currency pair from baseCurrency and quoteCurrency
              // Only show as selected if both are not XXX (specific pair selected)
              // If either is XXX, no currency pair should be selected
              const currentPair = currentBaseCurrency !== 'XXX' && currentQuoteCurrency !== 'XXX'
                ? `${currentBaseCurrency}/${currentQuoteCurrency}`
                : null; // No selection when filter dropdown is used
              
              // Get symbols for current asset class
              const assetClassSymbols = dmxSymbolsByAssetClass[currentAssetClass] || [];
              const isLoading = dmxSymbolsLoading[currentAssetClass] || false;
              
              // Fallback to hardcoded Forex symbols if no symbols loaded yet and asset class is forex
              const FOREX_SYMBOLS = [
                'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
                'EURJPY', 'GBPJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
                'EURGBP', 'EURAUD', 'EURCAD', 'EURCHF', 'EURNZD',
                'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPNZD',
                'AUDCAD', 'AUDCHF', 'AUDNZD',
                'CADCHF', 'CADNZD', 'CHFNZD'
              ];
              
              // Use asset class symbols if available, otherwise fallback to hardcoded Forex symbols for forex
              const symbolsToUse = assetClassSymbols.length > 0 
                ? assetClassSymbols 
                : (currentAssetClass === 'forex' ? FOREX_SYMBOLS : []);
              
              if (isLoading && assetClassSymbols.length === 0) {
                return (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-sm text-muted-foreground">Loading currency pairs...</span>
              </div>
                );
              }

              if (symbolsToUse.length === 0) {
                return (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-sm text-muted-foreground">No symbols available for {currentAssetClass}</span>
                  </div>
                );
              }

              // Deduplicate symbols and normalize for comparison
              const uniqueSymbols = Array.from(new Set(symbolsToUse));
              
              // Normalize symbol for comparison (handle both "EURUSD" and "EUR/USD" formats)
              const normalizeSymbol = (sym: string): string => {
                if (sym.includes('/')) {
                  return sym; // Already in "EUR/USD" format
                }
                // Convert "EURUSD" to "EUR/USD"
                if (sym.length === 6) {
                  return `${sym.substring(0, 3)}/${sym.substring(3)}`;
                }
                return sym;
              };

              return (
                <div className="grid grid-cols-2 gap-2">
                  {uniqueSymbols.map((symbol, index) => {
                    const normalizedSymbol = normalizeSymbol(symbol);
                    // Only show as selected if currentPair is not null (specific pair selected, not filter)
                    const isSelected = currentPair !== null && (currentPair === normalizedSymbol || currentPair === symbol);
                    
                    return (
                      <button
                        key={`${symbol}-${index}`}
                        onClick={() => {
                          // Extract base and quote from currency pair
                          // Handle formats: "EURUSD" or "EUR/USD"
                          let base = '';
                          let quote = '';
                          
                          if (symbol.includes('/')) {
                            // Format: "EUR/USD"
                            const parts = symbol.split('/');
                            if (parts.length === 2) {
                              base = parts[0];
                              quote = parts[1];
                            }
                          } else if (symbol.length === 6) {
                            // Format: "EURUSD"
                            base = symbol.substring(0, 3);
                            quote = symbol.substring(3, 6);
                          } else if (symbol.length > 6) {
                            // Handle longer symbols (e.g., indices, commodities)
                            // For non-forex, we might not have base/quote, so use XXX
                            base = 'XXX';
                            quote = 'USD';
                          }
                          
                          if (base && quote) {
                            // When currency pair is selected, clear filter dropdown selection
                            // Set filterMode to 'all' so the currency pair takes precedence
                            setSettings({ 
                              ...settings, 
                              baseCurrency: base,
                              quoteCurrency: quote,
                              filterMode: 'all'
                            });
                          }
                        }}
                        className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                          isSelected
                            ? 'bg-primary/20 text-primary font-medium border-primary/50'
                            : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                        }`}
                      >
                        <span>{normalizedSymbol}</span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
              </div>
              );
            })()}
          </div>
          )}

          <Separator className="bg-border" />

          {/* Time Frame */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Time Frame</Label>
            <div className="flex flex-col gap-2">
              {TIME_FRAMES.map((frame) => {
                const isActive = frame.value === currentTimeFrame;
                return (
                  <button
                    key={frame.value}
                    type="button"
                    onClick={() => setSettings({ ...settings, timeFrame: frame.value })}
                    className={cn(
                      "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                    )}
                  >
                    <span>{frame.label}</span>
                    {isActive && <Check className="w-5 h-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
    
    // Trending Topics Settings
    if (widgetType === 'trending-topics') {
      const currentLimit = settings.limit || 15;
      
      // Generate options from 5 to 100 in increments of 5
      const limitOptions = Array.from({ length: 20 }, (_, i) => (i + 1) * 5); // 5, 10, 15, ..., 100
      
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Limit</Label>
            <Select 
              value={currentLimit.toString()}
              onValueChange={(value) => setSettings({ ...settings, limit: parseInt(value, 10) })}
            >
              <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                {limitOptions.map((limit) => (
                  <SelectItem key={limit} value={limit.toString()} className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">{limit}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Number of trending topic items to return (default: 15)
            </p>
          </div>
        </div>
      );
    }
    
    // News Sentiment Settings
    if (widgetType === 'news-sentiment') {
      const modules = ['Forex', 'US Stocks', 'Commodities'];
      const currentModule = settings.module || 'Forex';
      const currentSymbols = settings.symbols || 'EURUSD';
      
      // Helper to render symbol selection for news-sentiment (uses settings.symbols instead of settings.symbol)
      const renderNewsSentimentSymbolSelection = (defaultSymbol: string) => {
        if (symbolsLoading) {
          return (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-muted-foreground">Loading symbols...</span>
            </div>
          );
        }

        if (symbolsError) {
          return (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-destructive">{symbolsError}</span>
            </div>
          );
        }

        if (availableSymbols.length === 0) {
          return (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-muted-foreground">No symbols available</span>
            </div>
          );
        }

        // Deduplicate symbols to avoid duplicate keys
        const uniqueSymbols = Array.from(new Set(availableSymbols));

        return (
          <div className="grid grid-cols-2 gap-2">
            {uniqueSymbols.map((symbol, index) => {
              const isSelected = (settings.symbols || defaultSymbol) === symbol;
              
              return (
                <button
                  key={`${symbol}-${index}`}
                  onClick={() => setSettings({ ...settings, symbols: symbol })}
                  className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                    isSelected
                      ? 'bg-primary/20 text-primary font-medium border-primary/50'
                      : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                  }`}
                >
                  <span>{symbol}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        );
      };
      
      return (
        <div className="space-y-6">
          {/* Asset Class Selection */}
          {!isModuleLocked && (
            <div className="space-y-3">
              <Label className="text-sm text-foreground">Asset Class</Label>
              <Select 
                value={currentModule}
                onValueChange={(value) => {
                  // Clear symbols immediately when module changes to prevent showing wrong symbols
                  setAvailableSymbols([]);
                  setLastFetchedModule(null);
                  // Update module - this will trigger useEffect to refetch symbols
                  setSettings({ ...settings, module: value, symbols: undefined });
                }}
              >
                <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                  {modules.map((module) => (
                    <SelectItem 
                      key={module} 
                      value={module}
                      className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border"
                    >
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Symbols Selection */}
          {!isSymbolLocked && (
            <div className="space-y-3">
              <Label className="text-sm text-foreground">Symbols</Label>
              {renderNewsSentimentSymbolSelection(currentSymbols)}
            </div>
          )}
        </div>
      );
    }
    
    // Gauge Overview Settings
    if (widgetType === 'gauge-overview') {
      const modules = ['Forex', 'US Stocks', 'Commodities'];
      const currentModule = settings.module || 'Forex';
      const currentSymbol = settings.symbol || 'AUDCAD';
      
      return (
        <div className="space-y-6">
          {/* Asset Class Selection */}
          {!isModuleLocked && (
            <div className="space-y-3">
              <Label className="text-sm text-foreground">Asset Class</Label>
              <Select 
                value={currentModule}
                onValueChange={(value) => {
                  // Clear symbols immediately when module changes to prevent showing wrong symbols
                  setAvailableSymbols([]);
                  setLastFetchedModule(null);
                  // Update module - this will trigger useEffect to refetch symbols
                  setSettings({ ...settings, module: value, symbol: undefined });
                }}
              >
                <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                  {modules.map((module) => (
                    <SelectItem 
                      key={module} 
                      value={module}
                      className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border"
                    >
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Symbol Selection */}
          {!isSymbolLocked && (
            <div className="space-y-3">
              <Label className="text-sm text-foreground">Symbol</Label>
              {renderCurrencyPairSelection(currentSymbol)}
            </div>
          )}
        </div>
      );
    }
    
    // Price Targets Settings
    if (widgetType === 'price-targets') {
      const currentSymbol = settings.symbol || 'NASDAQ:AAL';
      
      return (
        <div className="space-y-6">
          {/* Symbol Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Symbol</Label>
            {renderCurrencyPairSelection(currentSymbol, true, true)}
          </div>
        </div>
      );
    }
    
    // Analyst Recommendations Settings
    if (widgetType === 'analyst-recommendations') {
      const currentSymbol = settings.symbol || 'NASDAQ:AAL';
      
      return (
        <div className="space-y-6">
          {/* Symbol Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Symbol</Label>
            {renderCurrencyPairSelection(currentSymbol, true, true)}
          </div>
        </div>
      );
    }
    
    // Insider Transactions Settings
    if (widgetType === 'insider-transactions') {
      const currentSymbol = settings.symbol || 'NASDAQ:AAL';
      
      return (
        <div className="space-y-6">
          {/* Symbol Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Symbol</Label>
            {renderCurrencyPairSelection(currentSymbol, true, true)}
          </div>
        </div>
      );
    }
    
    // Institutional Shareholders Settings
    if (widgetType === 'institutional-shareholders') {
      const currentSymbol = settings.symbol || 'NASDAQ:AAL';
      
      return (
        <div className="space-y-6">
          {/* Symbol Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Symbol</Label>
            {renderCurrencyPairSelection(currentSymbol, true, true)}
          </div>
        </div>
      );
    }
    
    // Balance Sheet Settings
    if (widgetType === 'balance-sheet') {
      const currentSymbol = settings.symbol || 'NASDAQ:AAL';
      
      return (
        <div className="space-y-6">
          {/* Symbol Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Symbol</Label>
            {renderCurrencyPairSelection(currentSymbol, true, true)}
          </div>
        </div>
      );
    }
    
    // Income Statement Settings
    if (widgetType === 'income-statement') {
      const currentSymbol = settings.symbol || 'NASDAQ:AAL';
      
      return (
        <div className="space-y-6">
          {/* Symbol Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Symbol</Label>
            {renderCurrencyPairSelection(currentSymbol, true, true)}
          </div>
        </div>
      );
    }
    
    // Cash Flow Report Settings
    if (widgetType === 'cash-flow-report') {
      const currentSymbol = settings.symbol || 'NASDAQ:AAL';
      
      return (
        <div className="space-y-6">
          {/* Symbol Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Symbol</Label>
            {renderCurrencyPairSelection(currentSymbol, true, true)}
          </div>
        </div>
      );
    }
    
    // DMX Positioning Settings - Now uses dynamic symbol loading like DMX Open Interest
    if (widgetType === 'dmx-positioning') {
      const ASSET_CLASSES = [
        { value: "forex", label: "Forex" },
        { value: "crypto", label: "Crypto" },
        { value: "commodities", label: "Commodities" },
        { value: "indices", label: "Indices" },
      ];

      const currentAssetClass = settings.assetClass || "forex";
      const currentSymbols = dmxSymbolsByAssetClass[currentAssetClass] || [];
      const isLoading = dmxSymbolsLoading[currentAssetClass] || false;
      const currentSymbol = settings.symbol || currentSymbols[0] || '';
      
      return (
        <div className="space-y-6">
          {/* Asset Class */}
          {!isModuleLocked && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-semibold text-foreground">Asset Class</Label>
                <div className="flex flex-col gap-2">
                  {ASSET_CLASSES.map((asset) => {
                    const isActive = asset.value === currentAssetClass;
                    return (
                      <button
                        key={asset.value}
                        type="button"
                        onClick={() => {
                          // When asset class changes, clear the symbol first
                          // The useEffect will fetch symbols and set the first one
                          setSettings({ ...settings, assetClass: asset.value, symbol: '' });
                        }}
                        className={cn(
                          "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                          isActive
                            ? "border-primary bg-primary/10 text-foreground font-semibold"
                            : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                        )}
                      >
                        <span>{asset.label}</span>
                        {isActive && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-border" />
            </>
          )}

          {/* Symbol */}
          {!isSymbolLocked && (
            <div className="space-y-3">
              <Label className="text-base font-semibold text-foreground">Symbol</Label>
              {isLoading ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  Loading symbols...
                </div>
              ) : currentSymbols.length === 0 ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  No symbols available for this asset class
                </div>
              ) : (
                <Select
                  value={currentSymbol || ''}
                  onValueChange={(value) => setSettings({ ...settings, symbol: value })}
                >
                  <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                    <SelectValue placeholder="Select a symbol" />
                  </SelectTrigger>
                  <SelectContent 
                    className="max-h-[300px] rounded-none z-[10000]"
                    side="bottom"
                    sideOffset={4}
                    position="popper"
                    avoidCollisions={false}
                  >
                    {currentSymbols.map((symbol, index) => (
                      <SelectItem 
                        key={`${symbol}-${index}`} 
                        value={symbol}
                        className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border"
                      >
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>
      );
    }
    
    // Special settings for Economic Data Charts: Add Indicator form
    if (widgetType === 'economic-data-charts') {
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm text-foreground font-semibold">Add Indicator</Label>
            <div className="space-y-2">
              {/* Unified search for Category and Event */}
              <div ref={searchContainerRef}>
                <Label className="text-sm text-foreground">Search</Label>
                <div className="relative">
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (debounceTimer.current) clearTimeout(debounceTimer.current);
                    debounceTimer.current = setTimeout(() => {
                      setSearchQuery(v);
                      setShowSearchResults(true);
                      setActiveIndex(-1);
                    }, 120);
                  }}
                  onFocus={() => setShowSearchResults(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setShowSearchResults(false); }
                    if (e.key === 'Enter') {
                      if (activeIndex >= 0) {
                        const btn = searchResultsRef.current?.querySelectorAll('button')?.[activeIndex];
                        if (btn) (btn as HTMLButtonElement).click();
                        return;
                      }
                      const first = searchResultsRef.current?.querySelector('button');
                      if (first) (first as HTMLButtonElement).click();
                    }
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const total = searchResultsRef.current?.querySelectorAll('button')?.length || 0;
                      if (total > 0) setActiveIndex(i => Math.min(total - 1, i + 1));
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const total = searchResultsRef.current?.querySelectorAll('button')?.length || 0;
                      if (total > 0) setActiveIndex(i => Math.max(-1, i - 1));
                    }
                  }}
                  placeholder="Search category or event..."
                  className="mt-1 rounded-none border border-border text-lg"
                  ref={searchInputRef}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    onClick={() => { setSearchQuery(''); setActiveIndex(-1); setShowSearchResults(false); try { searchInputRef.current?.focus(); } catch {} }}
                    aria-label="Clear search"
                  >
                    Clear
                  </button>
                )}
                </div>
                {showSearchResults && searchQuery.trim().length > 1 && (
                  <div ref={searchResultsRef} className="mt-2 max-h-56 overflow-auto border border-border bg-popover text-popover-foreground rounded-none">
                    {(() => {
                      const q = searchQuery.toLowerCase();
                      const rows: { country: string; tab: string; event: string }[] = [];
                      const countries = econCountries.length ? econCountries : [];
                      // Build matches from whatever we have, and lazily request missing country-tab pairs
                      for (const country of countries) {
                        for (const tab of econTabs) {
                          const tabMatches = tab.toLowerCase().includes(q) || country.toLowerCase().includes(q);
                          const countryKey = country.toLowerCase();
                          const tabKey = `${countryKey}-${tab.toLowerCase()}`;
                          
                          // Try to get events from eventsByTab first (using consistent key format)
                          let evsLocal = eventsByTab[tabKey] || [];
                          
                          // Fallback to eventsIndex if not in eventsByTab
                          if (!evsLocal.length) {
                            evsLocal = eventsIndex[country]?.[tab] || [];
                          }
                          
                          // Only lazy fetch if we don't have events AND it seems relevant to the query
                          // AND we haven't already fetched it
                          if (!evsLocal.length && (tabMatches || q.length >= 2)) {
                            const fetchKey = `${country}||${tab}`;
                            // Only fetch if not already fetched or in flight
                            if (!inFlightRef.current.has(fetchKey) && !eventsIndex[country]?.[tab]) {
                              void ensureCountryTabEvents(country, tab);
                            }
                          }
                          
                          const evs = evsLocal;
                          for (const ev of evs) {
                            const evMatches = ev.toLowerCase().includes(q);
                            if (tabMatches || evMatches) rows.push({ country, tab, event: ev });
                          }
                        }
                      }
                      if (!rows.length) return <div className="px-3 py-2 text-base text-muted-foreground flex items-center justify-between"><span>No matches</span><span className="text-xs">{inFlightRef.current.size ? 'Loading…' : ''}</span></div>;
                      const total = rows.length;
                      const visible = Math.min(total, 150);
                      const header = (
                        <div key="search-header" className="px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
                          Showing {visible} of {total} results
                        </div>
                      );
                      return [header, ...rows.slice(0, 150).map(({ country, tab, event }, idx) => (
                        <button
                          key={`${country}-${tab}-${event}-${idx}`}
                          className={`w-full text-left px-3 py-2 text-lg flex items-center justify-between cursor-pointer ${activeIndex === idx ? 'bg-muted/70' : 'hover:bg-muted/70'}`}
                          onClick={() => {
                            console.log('📊 [Settings] Search result clicked:', { country, tab, event });
                            setEconCountry(country);
                            setEconTab(tab);
                            // Optimistically include the event in the dropdown and select it
                            setEconEvents(prev => (Array.isArray(prev) && prev.includes(event)) ? prev : [event, ...(prev || [])]);
                            setEconIndicator(event);
                            setSearchQuery('');
                            setShowSearchResults(false);
                            try {
                              const ev = new CustomEvent('macro-charts:add-series', { detail: { country, tab, indicator: event } });
                              console.log('📊 [Settings] Dispatching add-series event:', ev.detail);
                              window.dispatchEvent(ev);
                            } catch (error) {
                              console.error('❌ [Settings] Error dispatching event:', error);
                            }
                          }}
                        >
                          <span className="truncate">
                            <span className="text-muted-foreground"><Highlight text={country} q={q} /></span>
                            <span className="mx-2 text-muted-foreground">→</span>
                            <span className="text-muted-foreground"><Highlight text={tab} q={q} /></span>
                            <span className="mx-2 text-muted-foreground">→</span>
                            <span className="text-foreground"><Highlight text={event} q={q} /></span>
                          </span>
                          <span className="text-xs text-muted-foreground">{activeIndex === idx ? 'Enter' : 'Select'}</span>
                        </button>
                      ))];
                    })()}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-sm text-foreground">Country</Label>
                <select value={econCountry} onChange={(e)=>setEconCountry(e.target.value)} className="w-full mt-1 px-3 py-2.5 bg-background border border-border rounded-none text-foreground text-base">
                  <option value="">Select a country...</option>
                  {econCountries.map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <Label className="text-sm text-foreground">Category</Label>
                <select value={econTab} onChange={(e)=>{ const v = e.target.value; setEconTab(v); setEconIndicator(''); }} className="w-full mt-1 px-3 py-2.5 bg-background border border-border rounded-none text-foreground text-base">
                  <option value="">Select a category...</option>
                  {econTabs.map(t => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div>
                <Label className="text-sm text-foreground">Event</Label>
                <select value={econIndicator} onChange={(e)=>setEconIndicator(e.target.value)} className="w-full mt-1 px-3 py-2.5 bg-background border border-border rounded-none text-base">
                  <option value="">Select an indicator...</option>
                  {econEvents.map(ev => (<option key={ev} value={ev}>{ev}</option>))}
                </select>
              </div>
              <div className="text-xs text-muted-foreground">Use Apply to add the selected indicator to the chart.</div>
            </div>
          </div>
        </div>
      );
    }

    // Ticklist Settings
    if (widgetType === 'ticklist' && ticklistHandlers) {
      const {
        ticklists,
        taskListID,
        isLoadingLists,
        isSaving,
        isCreatingList,
        newListName,
        initialTaskName,
        onSelectTicklist,
        onCreateTicklist,
        onDeleteList,
        onSetIsCreatingList,
        onSetNewListName,
        onSetInitialTaskName,
      } = ticklistHandlers;

      return (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-base text-muted-foreground">
                Select List
              </label>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-lg text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => onSetIsCreatingList(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                New
              </Button>
            </div>

            {isCreatingList ? (
              <div className="space-y-3 mb-4">
                <Input
                  value={newListName}
                  onChange={(e) => onSetNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCreateTicklist();
                    if (e.key === "Escape") {
                      onSetIsCreatingList(false);
                      onSetNewListName("");
                    }
                  }}
                  placeholder="List name..."
                  className="h-8 text-lg"
                  autoFocus
                  disabled={isSaving}
                />
                <Input
                  value={initialTaskName}
                  onChange={(e) => onSetInitialTaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCreateTicklist();
                    if (e.key === "Escape") {
                      onSetIsCreatingList(false);
                      onSetInitialTaskName("");
                    }
                  }}
                  placeholder="Optional initial task"
                  className="h-8 text-lg"
                  disabled={isSaving}
                />
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={onCreateTicklist}
                    className="h-7 px-3 text-lg bg-primary hover:bg-primary/90"
                    disabled={isSaving}
                  >
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onSetIsCreatingList(false);
                      onSetNewListName("");
                      onSetInitialTaskName("");
                    }}
                    className="h-7 px-2 text-lg"
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              {isLoadingLists ? (
                <div className="text-lg text-muted-foreground">Loading ticklists...</div>
              ) : ticklists.length === 0 ? (
                <div className="text-lg text-muted-foreground">No ticklists available.</div>
              ) : (
                ticklists.map((list) => {
                  const isActive = list.TicklistID === taskListID;
                  return (
                    <div
                      key={list.TicklistID}
                      className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                        isActive
                          ? 'bg-primary/20 text-primary border-primary'
                          : 'bg-widget-header/50 text-foreground hover:bg-widget-header border-transparent'
                      }`}
                    >
                      <button
                        onClick={() => onSelectTicklist(String(list.TicklistID))}
                        className="flex-1 text-left"
                      >
                        <span className="text-lg truncate block">
                          {list.Title && list.Title.trim().length > 0
                            ? list.Title
                            : `List ${list.TicklistID}`}
                        </span>
                      </button>
                      {ticklists.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDeleteList(list.TicklistID)}
                          title="Delete list"
                          disabled={isSaving}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      );
    }

    // Tabbed Widget Settings
    if (widgetType === 'tabbed-widget') {
      const tabBarPosition = settings.tabBarPosition || 'bottom';
      return (
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold text-foreground">Tab Bar Position</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, tabBarPosition: 'top' })}
                className={cn(
                  "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                  tabBarPosition === 'top'
                    ? "border-primary bg-primary/10 text-foreground font-semibold"
                    : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                )}
              >
                <span>Top</span>
                {tabBarPosition === 'top' && <Check className="w-5 h-5 text-primary" />}
              </button>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, tabBarPosition: 'bottom' })}
                className={cn(
                  "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                  tabBarPosition === 'bottom'
                    ? "border-primary bg-primary/10 text-foreground font-semibold"
                    : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                )}
              >
                <span>Bottom</span>
                {tabBarPosition === 'bottom' && <Check className="w-5 h-5 text-primary" />}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Choose where the tab bar and widget header should be positioned.
            </p>
          </div>
        </div>
      );
    }

    // Price Chart Settings (TradingView Widget)
    // Supply and Demand Areas Settings
    if (widgetType === 'supply-demand-areas' || widgetType === 'supply-and-demand-areas') {
      const modules = ['Forex', 'Commodities', 'Indices'];
      const currentModule = settings.module || 'Forex';
      const currentSymbol = settings.symbol || 'EURUSD';
      const currentInterval = settings.timeframe || '1d';
      const intervals = [
        { value: '1h', label: 'Hourly' },
        { value: '1d', label: 'Daily' },
        { value: '1w', label: 'Weekly' }
      ];

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
      const formatSymbolForDisplay = (symbol: string, module: string): string => {
        if (module === 'Forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        return symbol;
      };

      return (
        <div className="space-y-4">
          {/* Asset Class Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Asset Class</Label>
            <div className="grid grid-cols-3 gap-2">
              {modules.map((module) => (
                <button
                  key={module}
                  onClick={() => {
                    setAvailableSymbols([]);
                    setLastFetchedModule(null);
                    setSettings({ ...settings, module: module, symbol: undefined });
                  }}
                  className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                    currentModule === module
                      ? "bg-primary/20 text-primary font-medium border-primary/50"
                      : "bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30"
                  }`}
                >
                  <span>{module}</span>
                  {currentModule === module && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Symbol Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Symbol</Label>
            {symbolsLoading ? (
              <div className="text-sm text-muted-foreground">Loading symbols...</div>
            ) : (
              <Select
                value={currentSymbol}
                onValueChange={(value) => setSettings({ ...settings, symbol: value })}
              >
                <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                  {availableSymbols.map((sym) => {
                    const displaySymbol = formatSymbolForDisplay(sym, currentModule);
                    return (
                      <SelectItem key={sym} value={sym} className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                        {displaySymbol}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator className="bg-border" />

          {/* Interval Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Interval</Label>
            <div className="grid grid-cols-3 gap-2">
              {intervals.map((interval) => (
                <button
                  key={interval.value}
                  onClick={() => setSettings({ ...settings, timeframe: interval.value })}
                  className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                    currentInterval === interval.value
                      ? "bg-primary/20 text-primary font-medium border-primary/50"
                      : "bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30"
                  }`}
                >
                  <span>{interval.label}</span>
                  {currentInterval === interval.value && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (widgetType === 'high-low-points' || widgetType === 'high-and-low-points') {
      const modules = ['Forex', 'Commodities', 'Indices'];
      const currentModule = settings.module || 'Forex';
      const currentSymbol = settings.symbol || 'EURUSD';
      const currentInterval = settings.timeframe || '1d';
      const intervals = [
        { value: '1h', label: 'Hourly' },
        { value: '1d', label: 'Daily' },
        { value: '1w', label: 'Weekly' }
      ];

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
      const formatSymbolForDisplay = (symbol: string, module: string): string => {
        if (module === 'Forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        return symbol;
      };

      return (
        <div className="space-y-4">
          {/* Asset Class Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Asset Class</Label>
            <div className="grid grid-cols-3 gap-2">
              {modules.map((module) => (
                <button
                  key={module}
                  onClick={() => {
                    setAvailableSymbols([]);
                    setLastFetchedModule(null);
                    setSettings({ ...settings, module: module, symbol: undefined });
                  }}
                  className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                    currentModule === module
                      ? "bg-primary/20 text-primary font-medium border-primary/50"
                      : "bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30"
                  }`}
                >
                  <span>{module}</span>
                  {currentModule === module && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Symbol Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Symbol</Label>
            {symbolsLoading ? (
              <div className="text-sm text-muted-foreground">Loading symbols...</div>
            ) : (
              <Select
                value={currentSymbol}
                onValueChange={(value) => setSettings({ ...settings, symbol: value })}
              >
                <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                  {availableSymbols.map((sym) => {
                    const displaySymbol = formatSymbolForDisplay(sym, currentModule);
                    return (
                      <SelectItem key={sym} value={sym} className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                        {displaySymbol}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator className="bg-border" />

          {/* Interval Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Interval</Label>
            <div className="grid grid-cols-3 gap-2">
              {intervals.map((interval) => (
                <button
                  key={interval.value}
                  onClick={() => setSettings({ ...settings, timeframe: interval.value })}
                  className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                    currentInterval === interval.value
                      ? "bg-primary/20 text-primary font-medium border-primary/50"
                      : "bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30"
                  }`}
                >
                  <span>{interval.label}</span>
                  {currentInterval === interval.value && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Session Ranges Settings
    if (widgetType === 'session-ranges') {
      const modules = ['Forex', 'Commodities', 'Indices'];
      const currentModule = settings.module || 'Forex';
      const currentSymbol = settings.symbol || 'EURUSD';

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
      const formatSymbolForDisplay = (symbol: string, module: string): string => {
        if (module === 'Forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        return symbol;
      };

      return (
        <div className="space-y-4">
          {/* Asset Class Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Asset Class</Label>
            <div className="grid grid-cols-3 gap-2">
              {modules.map((module) => (
                <button
                  key={module}
                  onClick={() => {
                    setAvailableSymbols([]);
                    setLastFetchedModule(null);
                    setSettings({ ...settings, module: module, symbol: undefined });
                  }}
                  className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                    currentModule === module
                      ? "bg-primary/20 text-primary font-medium border-primary/50"
                      : "bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30"
                  }`}
                >
                  <span>{module}</span>
                  {currentModule === module && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Symbol Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Symbol</Label>
            {symbolsLoading ? (
              <div className="text-sm text-muted-foreground">Loading symbols...</div>
            ) : (
              <Select
                value={currentSymbol}
                onValueChange={(value) => setSettings({ ...settings, symbol: value })}
              >
                <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                  {availableSymbols.map((sym) => {
                    const displaySymbol = formatSymbolForDisplay(sym, currentModule);
                    return (
                      <SelectItem key={sym} value={sym} className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                        {displaySymbol}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      );
    }

    // Percent Monthly Targets Settings
    if (widgetType === 'percent-monthly-targets') {
      const modules = ['Forex', 'Commodities', 'Indices'];
      const currentModule = settings.module || 'Forex';
      const currentSymbol = settings.symbol || 'EURUSD';

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
      const formatSymbolForDisplay = (symbol: string, module: string): string => {
        if (module === 'Forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        return symbol;
      };

      return (
        <div className="space-y-4">
          {/* Asset Class Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Asset Class</Label>
            <div className="grid grid-cols-3 gap-2">
              {modules.map((module) => (
                <button
                  key={module}
                  onClick={() => {
                    setAvailableSymbols([]);
                    setLastFetchedModule(null);
                    setSettings({ ...settings, module: module, symbol: undefined });
                  }}
                  className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                    currentModule === module
                      ? "bg-primary/20 text-primary font-medium border-primary/50"
                      : "bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30"
                  }`}
                >
                  <span>{module}</span>
                  {currentModule === module && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Symbol Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Symbol</Label>
            {symbolsLoading ? (
              <div className="text-sm text-muted-foreground">Loading symbols...</div>
            ) : (
              <Select
                value={currentSymbol}
                onValueChange={(value) => setSettings({ ...settings, symbol: value })}
              >
                <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                  {availableSymbols.map((sym) => {
                    const displaySymbol = formatSymbolForDisplay(sym, currentModule);
                    return (
                      <SelectItem key={sym} value={sym} className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                        {displaySymbol}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      );
    }

    // Quarter Movement Settings
    if (widgetType === 'quarter-movement') {
      const modules = ['Forex', 'Commodities', 'Indices'];
      const currentModule = settings.module || 'Forex';
      const currentSymbol = settings.symbol || 'EURUSD';

      const formatSymbolForDisplay = (symbol: string, module: string): string => {
        if (module === 'Forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        return symbol;
      };

      return (
        <div className="space-y-4">
          {/* Asset Class Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Asset Class</Label>
            <div className="grid grid-cols-3 gap-2">
              {modules.map((module) => (
                <button
                  key={module}
                  onClick={() => {
                    setAvailableSymbols([]);
                    setLastFetchedModule(null);
                    setSettings({ ...settings, module: module, symbol: undefined });
                  }}
                  className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                    currentModule === module
                      ? "bg-primary/20 text-primary font-medium border-primary/50"
                      : "bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30"
                  }`}
                >
                  <span>{module}</span>
                  {currentModule === module && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Symbol Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Symbol</Label>
            {symbolsLoading ? (
              <div className="text-sm text-muted-foreground">Loading symbols...</div>
            ) : (
              <Select
                value={currentSymbol}
                onValueChange={(value) => setSettings({ ...settings, symbol: value })}
              >
                <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                  {availableSymbols.map((sym) => {
                    const displaySymbol = formatSymbolForDisplay(sym, currentModule);
                    return (
                      <SelectItem key={sym} value={sym} className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                        {displaySymbol}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      );
    }

    // Seasonality Forecast Settings (including Seasonality Performance Table)
    if (widgetType === 'seasonality-forecast' || widgetType === 'seasonality-forecast-chart' || widgetType === 'seasonality-forecast-table' || widgetType === 'seasonality-performance-table') {
      // Map asset classes to API module names

      const ASSET_CLASSES = [
        { value: "forex", label: "Forex" },
        { value: "stocks", label: "Stocks" },
        { value: "commodities", label: "Commodities" },
        { value: "indices", label: "Indices" },
      ];

      const currentAssetClass = settings.assetClass || 'forex';
      const defaultSymbol = currentAssetClass === 'forex' ? 'EURUSD' : (availableSymbols[0] || '');

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
      const formatSymbolForDisplay = (symbol: string): string => {
        if (currentAssetClass === 'forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          // Forex pairs: EURUSD -> EUR/USD
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        // For other asset classes, return as-is
        return symbol;
      };

      return (
        <div className="space-y-6">
          {/* Asset Class */}
          {!isModuleLocked && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-semibold text-foreground">Asset Class</Label>
                <div className="flex flex-col gap-2">
                  {ASSET_CLASSES.map((asset) => {
                    const isActive = asset.value === currentAssetClass;
                    return (
                      <button
                        key={asset.value}
                        type="button"
                        onClick={() => {
                          // When asset class changes, clear the symbol first
                          // The useEffect will fetch symbols and set the first one
                          setSettings({ ...settings, assetClass: asset.value, symbol: '' });
                        }}
                        className={cn(
                          "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                          isActive
                            ? "border-primary bg-primary/10 text-foreground font-semibold"
                            : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                        )}
                      >
                        <span>{asset.label}</span>
                        {isActive && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Symbol Selection - Grid Style */}
              <div className="space-y-3">
                <Label className="text-base font-semibold text-foreground">Symbol</Label>
                {symbolsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-sm text-muted-foreground">Loading symbols...</span>
                  </div>
                ) : symbolsError ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-sm text-destructive">{symbolsError}</span>
                  </div>
                ) : availableSymbols.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-sm text-muted-foreground">No symbols available for this asset class</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from(new Set(availableSymbols)).map((symbol, index) => {
                      const isSelected = (settings.symbol || defaultSymbol) === symbol;
                      
                      return (
                        <button
                          key={`${symbol}-${index}`}
                          onClick={() => setSettings({ ...settings, symbol })}
                          className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                            isSelected
                              ? 'bg-primary/20 text-primary font-medium border-primary/50'
                              : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                          }`}
                        >
                          <span>{formatSymbolForDisplay(symbol)}</span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      );
    }


    // Seasonality Performance Chart Settings
    if (widgetType === 'seasonality-performance-chart') {

      const ASSET_CLASSES = [
        { value: "forex", label: "Forex" },
        { value: "stocks", label: "Stocks" },
        { value: "commodities", label: "Commodities" },
        { value: "indices", label: "Indices" },
      ];

      const currentAssetClass = settings.assetClass || 'forex';
      const defaultSymbol = currentAssetClass === 'forex' ? 'EURUSD' : (availableSymbols[0] || '');

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
      const formatSymbolForDisplay = (symbol: string): string => {
        if (currentAssetClass === 'forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          // Forex pairs: EURUSD -> EUR/USD
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        // For other asset classes, return as-is
        return symbol;
      };

      return (
        <div className="space-y-6">
          {/* Asset Class */}
          {!isModuleLocked && (
            <>
              <div className="space-y-3">
                <Label className="text-base font-semibold text-foreground">Asset Class</Label>
                <div className="flex flex-col gap-2">
                  {ASSET_CLASSES.map((asset) => {
                    const isActive = asset.value === currentAssetClass;
                    return (
                      <button
                        key={asset.value}
                        type="button"
                        onClick={() => {
                          // When asset class changes, clear the symbol first
                          // The useEffect will fetch symbols and set the first one
                          setSettings({ ...settings, assetClass: asset.value, symbol: '' });
                        }}
                        className={cn(
                          "flex items-center justify-between gap-2 border px-4 py-3 text-base text-left transition-colors",
                          isActive
                            ? "border-primary bg-primary/10 text-foreground font-semibold"
                            : "border-border bg-widget-body text-foreground hover:border-primary/50 hover:bg-widget-header/30"
                        )}
                      >
                        <span>{asset.label}</span>
                        {isActive && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-border" />
            </>
          )}

          {/* Symbol Selection - Grid Style */}
          {!isSymbolLocked && (
            <div className="space-y-3">
              <Label className="text-base font-semibold text-foreground">Symbol</Label>
              {symbolsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-muted-foreground">Loading symbols...</span>
                </div>
              ) : symbolsError ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-destructive">{symbolsError}</span>
                </div>
              ) : availableSymbols.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-muted-foreground">No symbols available for this asset class</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from(new Set(availableSymbols)).map((symbol, index) => {
                    const isSelected = (settings.symbol || defaultSymbol) === symbol;
                    
                    return (
                      <button
                        key={`${symbol}-${index}`}
                        onClick={() => setSettings({ ...settings, symbol })}
                        className={`px-3 py-3.5 text-sm border border-border cursor-pointer transition-colors flex items-center justify-center gap-2 rounded-none ${
                          isSelected
                            ? 'bg-primary/20 text-primary font-medium border-primary/50'
                            : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                        }`}
                      >
                        <span>{formatSymbolForDisplay(symbol)}</span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Economic Event Calendar Settings
    if (widgetType === 'economic-event-calendar') {
      const selectedCurrency = settings.currency || 'all';
      const dateRangeType = settings.dateRangeType || 'thisWeek';
      const customStartDate = settings.customStartDate || '';
      const customEndDate = settings.customEndDate || '';
      const autoUpdate = settings.autoUpdate ?? false;
      const orientation = settings.orientation || 'vertical';
      
      // Common currencies for economic calendar
      const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY', 'KRW', 'INR', 'BRL', 'MXN', 'ZAR', 'TRY', 'RUB', 'SEK', 'NOK', 'DKK', 'PLN'];

      // Helper function to format date as DD/MM/YYYY
      const formatDate = (date: Date): string => {
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      };

      // Helper function to parse DD/MM/YYYY to Date
      const parseDate = (dateStr: string): Date | undefined => {
        if (!dateStr) return undefined;
        const parts = dateStr.split('/');
        if (parts.length !== 3) return undefined;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      };

      // Calculate date ranges
      const getTodayRange = () => {
        const today = new Date();
        return { start: formatDate(today), end: formatDate(today) };
      };

      const getThisWeekRange = () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek); // Go to Sunday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to Saturday
        return { start: formatDate(startOfWeek), end: formatDate(endOfWeek) };
      };

      const getLastWeekRange = () => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - dayOfWeek - 7); // Go to last Sunday
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6); // Go to last Saturday
        return { start: formatDate(startOfLastWeek), end: formatDate(endOfLastWeek) };
      };

      const getThisMonthRange = () => {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: formatDate(startOfMonth), end: formatDate(endOfMonth) };
      };

      // Handle quick date range selection
      const handleQuickDateRange = (type: 'today' | 'thisWeek' | 'lastWeek' | 'thisMonth') => {
        let dateRange: { start: string; end: string };
        if (type === 'today') {
          dateRange = getTodayRange();
        } else if (type === 'thisWeek') {
          dateRange = getThisWeekRange();
        } else if (type === 'lastWeek') {
          dateRange = getLastWeekRange();
        } else {
          dateRange = getThisMonthRange();
        }
        setSettings({
          ...settings,
          dateRangeType: type,
          customStartDate: dateRange.start,
          customEndDate: dateRange.end
        });
      };

      // Handle custom date selection
      const handleCustomDateChange = (field: 'start' | 'end', date: Date | undefined) => {
        if (!date) return;
        const formatted = formatDate(date);
        if (field === 'start') {
          setSettings({
            ...settings,
            dateRangeType: 'custom',
            customStartDate: formatted,
            customEndDate: customEndDate || formatted
          });
        } else {
          setSettings({
            ...settings,
            dateRangeType: 'custom',
            customStartDate: customStartDate || formatted,
            customEndDate: formatted
          });
        }
      };

      return (
        <div className="space-y-4">
          {/* Currency Filter */}
          <div className="border border-border rounded-lg p-4 bg-card/50">
            <div className="space-y-3">
              <Label className="text-base font-semibold text-foreground">Currency Filter</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSettings({ ...settings, currency: 'all' })}
                  className={`px-3 py-2 text-sm border border-border cursor-pointer transition-colors rounded flex items-center justify-center gap-2 ${
                    selectedCurrency === 'all'
                      ? 'bg-primary/20 text-primary font-medium border-primary/50'
                      : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                  }`}
                >
                  <span>All</span>
                  {selectedCurrency === 'all' && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
                {currencies.map((currency) => {
                  const isSelected = selectedCurrency === currency;
                  return (
                    <button
                      key={currency}
                      onClick={() => setSettings({ ...settings, currency })}
                      className={`px-3 py-2 text-sm border border-border cursor-pointer transition-colors rounded flex items-center justify-center gap-2 ${
                        isSelected
                          ? 'bg-primary/20 text-primary font-medium border-primary/50'
                          : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                      }`}
                    >
                      <span>{currency}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="border border-border rounded-lg p-4 bg-card/50">
            <div className="space-y-3">
              <Label className="text-base font-semibold text-foreground">Date Range</Label>
              
              {/* Quick Options */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleQuickDateRange('today')}
                  className={`px-3 py-2 text-sm border border-border cursor-pointer transition-colors rounded ${
                    dateRangeType === 'today'
                      ? 'bg-primary/20 text-primary font-medium border-primary/50'
                      : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => handleQuickDateRange('thisWeek')}
                  className={`px-3 py-2 text-sm border border-border cursor-pointer transition-colors rounded ${
                    dateRangeType === 'thisWeek'
                      ? 'bg-primary/20 text-primary font-medium border-primary/50'
                      : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => handleQuickDateRange('lastWeek')}
                  className={`px-3 py-2 text-sm border border-border cursor-pointer transition-colors rounded ${
                    dateRangeType === 'lastWeek'
                      ? 'bg-primary/20 text-primary font-medium border-primary/50'
                      : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                  }`}
                >
                  Last Week
                </button>
                <button
                  onClick={() => handleQuickDateRange('thisMonth')}
                  className={`px-3 py-2 text-sm border border-border cursor-pointer transition-colors rounded ${
                    dateRangeType === 'thisMonth'
                      ? 'bg-primary/20 text-primary font-medium border-primary/50'
                      : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setSettings({ ...settings, dateRangeType: 'custom' })}
                  className={`px-3 py-2 text-sm border border-border cursor-pointer transition-colors rounded ${
                    dateRangeType === 'custom'
                      ? 'bg-primary/20 text-primary font-medium border-primary/50'
                      : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Custom Date Pickers */}
              {dateRangeType === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Start Date</Label>
                    <Popover open={startDatePickerOpen} onOpenChange={setStartDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {customStartDate || 'Select start date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={parseDate(customStartDate)}
                          onSelect={(date) => {
                            handleCustomDateChange('start', date);
                            setStartDatePickerOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">End Date</Label>
                    <Popover open={endDatePickerOpen} onOpenChange={setEndDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {customEndDate || 'Select end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={parseDate(customEndDate)}
                          onSelect={(date) => {
                            handleCustomDateChange('end', date);
                            setEndDatePickerOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {/* Display current date range for quick options */}
              {(dateRangeType === 'today' || dateRangeType === 'thisWeek') && (
                <div className="text-sm text-muted-foreground">
                  {dateRangeType === 'today' ? (
                    <span>Showing: {getTodayRange().start}</span>
                  ) : (
                    <span>Showing: {getThisWeekRange().start} - {getThisWeekRange().end}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Auto-Update Checkbox */}
          <div className="border border-border rounded-lg p-4 bg-card/50">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-update"
                checked={autoUpdate}
                onCheckedChange={(checked) => {
                  setSettings({ ...settings, autoUpdate: checked === true });
                }}
              />
              <Label
                htmlFor="auto-update"
                className="text-sm font-normal cursor-pointer"
              >
                Auto-update
              </Label>
            </div>
          </div>

          {/* Stack Days Selection */}
          <div className="border border-border rounded-lg p-4 bg-card/50">
            <div className="flex items-center gap-3">
              <Label className="text-base font-semibold text-foreground whitespace-nowrap">Stack Days:</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSettings({ ...settings, orientation: 'vertical' })}
                  className={`px-3 py-2 text-sm border border-border cursor-pointer transition-colors rounded flex items-center justify-center gap-2 ${
                    orientation === 'vertical'
                      ? 'bg-primary/20 text-primary font-medium border-primary/50'
                      : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                  }`}
                >
                  <span>Vertical</span>
                  {orientation === 'vertical' && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
                <button
                  onClick={() => setSettings({ ...settings, orientation: 'horizontal' })}
                  className={`px-3 py-2 text-sm border border-border cursor-pointer transition-colors rounded flex items-center justify-center gap-2 ${
                    orientation === 'horizontal'
                      ? 'bg-primary/20 text-primary font-medium border-primary/50'
                      : 'bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30'
                  }`}
                >
                  <span>Horizontal</span>
                  {orientation === 'horizontal' && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (widgetType === 'price-chart' || widgetType === 'information-chart') {
      const modules = ['Forex', 'Commodities', 'Indices'];
      const currentModule = settings.module || 'Forex';
      const currentSymbol = settings.symbol || 'EURUSD';
      const currentChartStyle = settings.chartType || 'candlestick';
      const currentShowVolume = settings.showVolume ?? false;

      // Format symbol for display (e.g., "EURUSD" -> "EUR/USD" for forex)
      const formatSymbolForDisplay = (symbol: string, module: string): string => {
        if (module === 'Forex' && symbol && symbol.length === 6 && !symbol.includes('/') && !symbol.includes(':')) {
          return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
        }
        return symbol;
      };

      return (
        <div className="space-y-6">
          {/* Asset Class Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Asset Class</Label>
            <Select 
              value={currentModule}
              onValueChange={(value) => {
                setAvailableSymbols([]);
                setLastFetchedModule(null);
                setSettings({ ...settings, module: value, symbol: undefined });
              }}
            >
              <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                {modules.map((module) => (
                  <SelectItem key={module} value={module} className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Symbol Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Symbol</Label>
            {symbolsLoading ? (
              <div className="text-sm text-muted-foreground">Loading symbols...</div>
            ) : (
              <Select
                value={currentSymbol}
                onValueChange={(value) => setSettings({ ...settings, symbol: value })}
              >
                <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                  {availableSymbols.map((sym) => {
                    const displaySymbol = formatSymbolForDisplay(sym, currentModule);
                    return (
                      <SelectItem key={sym} value={sym} className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">
                        {displaySymbol}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Chart Style Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Chart Style</Label>
            <Select
              value={currentChartStyle}
              onValueChange={(value) => setSettings({ ...settings, chartType: value })}
            >
              <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                <SelectItem value="candlestick" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">Candlestick</SelectItem>
                <SelectItem value="area" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">Area</SelectItem>
                <SelectItem value="line" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">Line</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show Volume Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Show Volume</Label>
            <Select
              value={currentShowVolume ? "yes" : "no"}
              onValueChange={(value) => setSettings({ ...settings, showVolume: value === "yes" })}
            >
              <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                <SelectItem value="yes" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">Yes</SelectItem>
                <SelectItem value="no" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timeframe Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Timeframe</Label>
            <Select
              value={settings.timeframe || '1d'}
              onValueChange={(value) => setSettings({ ...settings, timeframe: value })}
            >
              <SelectTrigger className="w-full h-14 rounded-none border-border focus-visible:border-primary focus-visible:ring-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] rounded-none z-[10000]">
                <SelectItem value="1m" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">1m</SelectItem>
                <SelectItem value="5m" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">5m</SelectItem>
                <SelectItem value="15m" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">15m</SelectItem>
                <SelectItem value="30m" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">30m</SelectItem>
                <SelectItem value="1h" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">1h</SelectItem>
                <SelectItem value="4h" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">4h</SelectItem>
                <SelectItem value="1d" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">1d</SelectItem>
                <SelectItem value="1w" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">1w</SelectItem>
                <SelectItem value="1M" className="h-12 py-3 text-base rounded-none focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary border-b border-border">1mo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    // Overview List Settings - Asset Class selection
    if (widgetType === 'overview-list') {
      const listTypes = ['Forex', 'Stocks', 'Commodities']; // Excluding Crypto
      const currentListType = settings.listType || 'Forex';
      
      return (
        <div className="space-y-6">
          {/* Asset Class Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground">Asset Class</Label>
            <div className="grid grid-cols-1 gap-2">
              {listTypes.map((listType) => {
                const isSelected = currentListType === listType;
                
                return (
                  <button
                    key={listType}
                    type="button"
                    onClick={() => setSettings({ ...settings, listType })}
                    className={cn(
                      "flex items-center justify-between border px-4 py-3 text-base transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border/60 bg-widget-header text-foreground hover:border-primary/40"
                    )}
                  >
                    <span>{listType}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // COT Chart View Settings
    if (widgetType === 'cot-chart-view') {
      const dataTypes = [
        { value: 'OpenInterest', label: 'Open Interest' },
        { value: 'LongShortPosition', label: 'Long Short Position' },
        { value: 'LongShortPercent', label: 'Long Short Percent' },
        { value: 'NetPosition', label: 'Net Position' },
        { value: 'NetPercent', label: 'Net Percent' }
      ];
      const owners = [
        { value: 'Dealer Intermediary', label: 'Dealer Intermediary' },
        { value: 'Asset Manager / Institutional', label: 'Asset Manager / Institutional' },
        { value: 'Leveraged Funds', label: 'Leveraged Funds' }
      ];

      const currentDataType = settings.cotDataType || 'NetPercent';
      const currentOwner = settings.cotOwner || 'Dealer Intermediary';

      const handleDataTypeChange = (dataType: string) => {
        const updatedSettings = { ...settings, cotDataType: dataType };
        setSettings(updatedSettings);
        // Save immediately on change
        onSave(updatedSettings);
      };

      const handleOwnerChange = (owner: string) => {
        const updatedSettings = { ...settings, cotOwner: owner };
        setSettings(updatedSettings);
        // Save immediately on change
        onSave(updatedSettings);
      };

      return (
        <div className="space-y-6">
          {/* Data Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground font-semibold">Data Type</Label>
            <div className="space-y-2">
              {dataTypes.map((type) => {
                const isSelected = currentDataType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleDataTypeChange(type.value)}
                    className={cn(
                      "w-full px-4 py-3 text-sm border border-border cursor-pointer transition-colors flex items-center justify-between rounded-none",
                      isSelected
                        ? "bg-primary/20 text-primary font-medium border-primary/50"
                        : "bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30"
                    )}
                  >
                    <span>{type.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Owner Selection */}
          <div className="space-y-3">
            <Label className="text-sm text-foreground font-semibold">Owner</Label>
            <div className="space-y-2">
              {owners.map((owner) => {
                const isSelected = currentOwner === owner.value;
                return (
                  <button
                    key={owner.value}
                    type="button"
                    onClick={() => handleOwnerChange(owner.value)}
                    className={cn(
                      "w-full px-4 py-3 text-sm border border-border cursor-pointer transition-colors flex items-center justify-between rounded-none",
                      isSelected
                        ? "bg-primary/20 text-primary font-medium border-primary/50"
                        : "bg-background text-foreground hover:bg-widget-header/30 hover:border-primary/30"
                    )}
                  >
                    <span>{owner.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      );
    }

    // Default settings content
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-sm text-foreground font-semibold">Display Settings</Label>
          <div className="text-sm text-muted-foreground">
            No additional settings available for this widget.
          </div>
        </div>
      </div>
    );
  };

  // Track mounted state for portal
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Use portal to render directly to body, escaping stacking context
  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop - Click to Close */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Slide-in Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[360px] bg-card border-l border-border z-[9999] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-widget-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getWidgetIcon()}
              <h3 className="text-base text-foreground font-semibold">
                {(() => {
                  const widget = availableWidgets.find(w => w.id === widgetType);
                  const widgetName = widget?.name || widgetType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                  return `${widgetName} Settings`;
                })()}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100%-120px)]">
          <div className="p-4">
            {renderSettingsContent()}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-10 border-border hover:bg-muted text-base font-semibold rounded-none"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-10 bg-primary hover:bg-primary/90 text-base font-semibold rounded-none"
              onClick={() => {
                try {
                  if (widgetType === 'economic-data-charts') {
                    const ev = new CustomEvent('macro-charts:add-series', {
                      detail: { country: econCountry, tab: econTab, indicator: econIndicator },
                    });
                    window.dispatchEvent(ev);
                  }
                  if (widgetType === 'trading-journal') {
                    const nextId = parseJournalId(settings?.journalID ?? null);
                    const savedId = parseJournalId(currentSettings?.journalID ?? null);
                    if (nextId && nextId !== savedId) {
                      emitJournalEvent({ action: 'select', journalId: nextId });
                    }
                  }
                } catch (error) {
                  console.error(error);
                }
                handleSave();
              }}
              style={{ display: 'none' }}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={journalToDelete !== null}
        onClose={() => setJournalToDelete(null)}
        onConfirm={handleDeleteJournalSetting}
        title="Delete Journal"
        message="Deleting this journal will remove all entries. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeletingJournal}
        sharpCorners
      />
      <ConfirmDialog
        isOpen={noteToDelete !== null}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleDeleteNoteSetting}
        title="Delete Note"
        message="Deleting this note cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeletingNote}
        sharpCorners
      />
      <ConfirmDialog
        isOpen={noteToDelete !== null}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleDeleteNoteSetting}
        title="Delete Note"
        message="Deleting this note cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeletingNote}
        sharpCorners
      />
      <ConfirmDialog
        isOpen={watchlistToDelete !== null}
        onClose={() => setWatchlistToDelete(null)}
        onConfirm={handleDeleteWatchlistSetting}
        title="Delete Watchlist"
        message="Deleting this watchlist will remove all symbols. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeletingWatchlist}
        sharpCorners
      />
    </>,    
    document.body
  );
}






