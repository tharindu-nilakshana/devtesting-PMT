"use client";

import Image from "next/image";
import {
  X,
  Filter,
  TrendingUp,
  FileText,
  AlertTriangle,
  Info,
  Bell,
  Volume2,
  VolumeX,
  Smartphone,
  RefreshCw,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useCallback, useMemo } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import { useAuth } from "@/contexts/AuthContext";
import { useFCM } from "@/hooks/useFCM";
import widgetDataWebSocket from "@/utils/widgetWebSocket";

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = "all" | "analyst-files" | "real-time-news" | "event-calendar";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  icon: "chart" | "file" | "alert" | "info";
  isNew?: boolean;
  metadata?: Record<string, string | number | null | undefined>;
}

interface TabState {
  items: NotificationItem[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

interface RealtimeNewsFilters {
  sections: string[];
  priorities: string[];
}

interface EventCalendarFilters {
  currencies: string[];
  importance: string[];
}

interface FilterResponse {
  status: string;
  filters: RealtimeNewsFilters | EventCalendarFilters;
}

const TAB_CONFIG: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "analyst-files", label: "Analyst Files" },
  { key: "real-time-news", label: "Real Time News" },
  { key: "event-calendar", label: "Event Calendar" },
];

// Map of WebSocket widget names to tab keys and alert messages
const WIDGET_TO_TAB_MAP: Record<string, { tabs: TabKey[]; alertMessage: string }> = {
  'UserNotification': { 
    tabs: ['all', 'analyst-files'],
    alertMessage: 'Notification Alert: User notification update'
  },
  'realtimenews': { 
    tabs: ['real-time-news'],
    alertMessage: 'Notification Alert: Real time news notification'
  },
  'EventCalendar': { 
    tabs: ['event-calendar'],
    alertMessage: 'Notification Alert: Calendar event notification'
  },
};

export function NotificationsPanel({ isOpen, onClose }: NotificationsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [availableFilters, setAvailableFilters] = useState<RealtimeNewsFilters | null>(null);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [selectedPriorities, setSelectedPriorities] = useState<Set<string>>(new Set());
  const [availableEventFilters, setAvailableEventFilters] = useState<EventCalendarFilters | null>(null);
  const [selectedCurrencies, setSelectedCurrencies] = useState<Set<string>>(new Set());
  const [selectedImportance, setSelectedImportance] = useState<Set<string>>(new Set());
  const [loadingFilters, setLoadingFilters] = useState(false);

  // Notify other panels when opening
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('panel-opening', { detail: { panel: 'notifications' } }));
    }
  }, [isOpen]);

  // Listen for other panels opening
  useEffect(() => {
    const handlePanelOpening = (event: Event) => {
      const customEvent = event as CustomEvent<{ panel: string }>;
      if (customEvent.detail.panel !== 'notifications' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('panel-opening', handlePanelOpening);
    return () => window.removeEventListener('panel-opening', handlePanelOpening);
  }, [isOpen, onClose]);
  const { user } = useAuth();
  const { preferences, toggleNotifications, setFcmCallback, updatePreference } = usePreferences(user?.id);
  const { isSupported, isInitialized, initialize, setupNotificationListener, disable } = useFCM();

  // Initialize FCM when notifications are enabled
  useEffect(() => {
    if (user?.id && preferences.notificationsOn && isSupported) {
      setFcmCallback(() => initialize);
      initialize();
    }
  }, [user?.id, preferences.notificationsOn, isSupported, initialize, setFcmCallback]);

  // Setup notification listener
  useEffect(() => {
    if (isInitialized) {
      setupNotificationListener((payload) => {
        console.log("Received notification:", payload);
      });
    }
  }, [isInitialized, setupNotificationListener]);

  const [tabState, setTabState] = useState<Record<TabKey, TabState>>({
    all: { items: [], loading: false, error: null, initialized: false },
    "analyst-files": { items: [], loading: false, error: null, initialized: false },
    "real-time-news": { items: [], loading: false, error: null, initialized: false },
    "event-calendar": { items: [], loading: false, error: null, initialized: false },
  });

  const notificationsEnabled = preferences.notificationsOn;
  const currentTabState = tabState[activeTab];
  const [searchFieldFlash, setSearchFieldFlash] = useState(false);

  const fetchNotifications = useCallback(
    async (tab: TabKey, { force = false }: { force?: boolean } = {}) => {
      let shouldSkip = false;
      setTabState((previous) => {
        const next = { ...previous };
        const state = previous[tab];

        if (!force && state.loading) {
          shouldSkip = true;
          return previous;
        }

        next[tab] = {
          ...state,
          loading: true,
          error: null,
        };

        return next;
      });

      if (shouldSkip) return;

      try {
        const response = await fetch("/api/pmt/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tab }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `Failed to fetch ${tab} notifications`);
        }

        const json = await response.json();
        const items: NotificationItem[] = Array.isArray(json?.data?.notifications)
          ? json.data.notifications
          : [];

        if (tab === "all") {
          const s3Items = items.filter(
            (item) => item.metadata?.notification_type === "s3_file",
          );
          if (s3Items.length > 0) {
            console.group("[Notifications] S3 File Companies");
            s3Items.forEach((item) => {
              const institute = item.metadata?.institute ?? "Unknown institute";
              console.log(`• ${item.title} — ${institute}`);
            });
            console.groupEnd();
          }
        }

        setTabState((previous) => ({
          ...previous,
          [tab]: {
            items,
            loading: false,
            error: null,
            initialized: true,
          },
        }));
      } catch (error) {
        console.error(`[Notifications] Failed to load ${tab}:`, error);
        setTabState((previous) => ({
          ...previous,
          [tab]: {
            ...previous[tab],
            loading: false,
            error: error instanceof Error ? error.message : "Failed to load notifications",
            initialized: previous[tab].initialized,
          },
        }));
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return;
    fetchNotifications(activeTab, { force: true });
  }, [activeTab, fetchNotifications, isOpen]);

  // WebSocket listener for notification alerts (always active when notifications enabled)
  // This dispatches alerts to TopNav even when panel is closed
  useEffect(() => {
    if (!notificationsEnabled || typeof window === 'undefined') {
      return;
    }

    console.log('🔔 [NotificationsPanel] Setting up global WebSocket listener for notification alerts...');

    // Handler for WebSocket events that dispatches alerts
    const handleNotificationAlert = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<{
          widgetName: string;
          data: any;
          rawData: string;
          timestamp: string;
        }>;
        
        const widgetName = customEvent.detail?.widgetName;
        if (!widgetName) return;

        const widgetKey = String(widgetName || '').trim();
        
        // Check if this widget update is relevant for notifications
        const matchingEntry = Object.entries(WIDGET_TO_TAB_MAP).find(([key]) => {
          const keyLower = key.toLowerCase();
          const widgetLower = widgetKey.toLowerCase();
          return widgetLower === keyLower || widgetLower.includes(keyLower) || keyLower.includes(widgetLower);
        });

        if (matchingEntry) {
          const [, config] = matchingEntry;
          const { alertMessage } = config;
          
          // Always dispatch notification alert event to TopNav (even when panel is closed)
          const notificationAlertEvent = new CustomEvent('pmt-notification-alert', {
            detail: {
              show: true,
              message: alertMessage,
              timestamp: Date.now()
            }
          });
          window.dispatchEvent(notificationAlertEvent);
          
          // Hide alert after 3 seconds
          setTimeout(() => {
            const hideAlertEvent = new CustomEvent('pmt-notification-alert', {
              detail: {
                show: false,
                timestamp: Date.now()
              }
            });
            window.dispatchEvent(hideAlertEvent);
          }, 3000);
        }
      } catch (error) {
        console.error('🔔 [NotificationsPanel] Error handling notification alert:', error);
      }
    };

    // Also listen to pmt-rts events
    const handleRtsAlert = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<string>;
        const widgetName = customEvent.detail;
        if (!widgetName) return;

        const syntheticEvent = new CustomEvent('pmt-widget-data', {
          detail: { widgetName }
        });
        handleNotificationAlert(syntheticEvent);
      } catch (error) {
        console.error('🔔 [NotificationsPanel] Error handling RTS alert:', error);
      }
    };

    // Connect to WebSocket and set up listeners
    const setupGlobalListener = async () => {
      try {
        // Listen for detailed WebSocket events
        window.addEventListener('pmt-widget-data', handleNotificationAlert);
        window.addEventListener('pmt-rts', handleRtsAlert);

        // Connect to WebSocket to ensure we receive events (shared connection)
        await widgetDataWebSocket.connect();
        
        console.log('✅ [NotificationsPanel] Global WebSocket listener established for notification alerts');
      } catch (error) {
        console.error('❌ [NotificationsPanel] Failed to setup global WebSocket listener:', error);
      }
    };

    // Setup with a small delay
    const timeoutId = setTimeout(() => {
      setupGlobalListener();
    }, 100);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('pmt-widget-data', handleNotificationAlert);
      window.removeEventListener('pmt-rts', handleRtsAlert);
    };
  }, [notificationsEnabled]);

  // WebSocket integration for real-time notification updates (only when panel is open)
  useEffect(() => {
    // Only connect when panel is open and notifications are enabled
    if (!isOpen || !notificationsEnabled || typeof window === 'undefined') {
      return;
    }

    console.log('🔔 [NotificationsPanel] Setting up WebSocket connection for panel refresh...');

    // Handler for WebSocket events when panel is open
    const handleWebSocketUpdate = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<{
          widgetName: string;
          data: any;
          rawData: string;
          timestamp: string;
        }>;
        
        const widgetName = customEvent.detail?.widgetName;
        if (!widgetName) return;

        const widgetKey = String(widgetName || '').trim();
        
        console.log(`🔔 [NotificationsPanel] WebSocket message received: ${widgetKey}`);
        
        // Check if this widget update is relevant for any tab
        const matchingEntry = Object.entries(WIDGET_TO_TAB_MAP).find(([key]) => {
          const keyLower = key.toLowerCase();
          const widgetLower = widgetKey.toLowerCase();
          return widgetLower === keyLower || widgetLower.includes(keyLower) || keyLower.includes(widgetLower);
        });

        if (matchingEntry) {
          const [, config] = matchingEntry;
          const { tabs } = config;
          
          // Conditional animation based on notification mode:
          // - Loud mode: Flash the search field
          // - Silent mode: Trigger bell pulsing animation in TopNav
          if (preferences.notificationsOn) {
            // Loud mode: Flash the refresh button area
          setSearchFieldFlash(true);
          setTimeout(() => {
            setSearchFieldFlash(false);
          }, 3000);
          } else {
            // Silent mode: Trigger bell animation in TopNav
            window.dispatchEvent(new CustomEvent('pmt-bell-animation-trigger', {
              detail: { timestamp: Date.now() }
            }));
          }
          
          // Only refresh if the active tab matches
          if (tabs.includes(activeTab)) {
            console.log(`🔔 [NotificationsPanel] WebSocket update matched for ${widgetKey}, refreshing tab: ${activeTab}`);
            fetchNotifications(activeTab, { force: true });
          } else {
            console.log(`🔔 [NotificationsPanel] WebSocket update received for ${widgetKey}, but active tab is ${activeTab} (matched tabs: ${tabs.join(', ')})`);
          }
        }
      } catch (error) {
        console.error('🔔 [NotificationsPanel] Error handling WebSocket event:', error);
      }
    };

    // Also listen to the pmt-rts event (dispatched by WSBoot)
    const handleRtsEvent = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<string>;
        const widgetName = customEvent.detail;
        if (!widgetName) return;

        const syntheticEvent = new CustomEvent('pmt-widget-data', {
          detail: { widgetName }
        });
        handleWebSocketUpdate(syntheticEvent);
      } catch (error) {
        console.error('🔔 [NotificationsPanel] Error handling RTS event:', error);
      }
    };

    // Connect to WebSocket and set up listeners
    const connectWebSocket = async () => {
      try {
        // Listen for detailed WebSocket events (dispatched by widgetDataWebSocket)
        window.addEventListener('pmt-widget-data', handleWebSocketUpdate);
        
        // Also listen to pmt-rts events (dispatched by WSBoot)
        window.addEventListener('pmt-rts', handleRtsEvent);

        // Connect to WebSocket (if not already connected, this is a no-op)
        await widgetDataWebSocket.connect();
        
        console.log('✅ [NotificationsPanel] WebSocket connection established and listeners registered');
      } catch (error) {
        console.error('❌ [NotificationsPanel] Failed to connect WebSocket:', error);
      }
    };

    // Connect with a small delay to ensure component is ready
    const timeoutId = setTimeout(() => {
      connectWebSocket();
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      console.log('🧹 [NotificationsPanel] Cleaning up WebSocket listeners...');
      
      // Remove event listeners
      window.removeEventListener('pmt-widget-data', handleWebSocketUpdate);
      window.removeEventListener('pmt-rts', handleRtsEvent);
    };
  }, [isOpen, activeTab, fetchNotifications, notificationsEnabled]);

  // Custom toggle handler that properly manages FCM
  const handleToggleNotifications = async () => {
    if (preferences.notificationsOn) {
      console.log("🔕 Disabling notifications and FCM...");
      await disable();
    }

    toggleNotifications();
  };

  const soundOptions = [
    { value: "0", label: "Chime" },
    { value: "1", label: "Bell" },
    { value: "2", label: "Ding" },
    { value: "3", label: "Pop" },
    { value: "4", label: "Alert" },
  ];

const notificationLogoFiles: Record<string, string> = {
  anz: "ANZ.png",
  barclays: "Barclays.png",
  citifx: "CitiFX.png",
  creditagricole: "Crédit Agricole.png",
  goldmansachs: "Goldman Sachs.png",
  ing: "ING.png",
  jpmorgan: "J.P. Morgan.png",
  mizuhobank: "Mizuho Bank.png",
  mufg: "MUFG.png",
  natixis: "Natixis.png",
  qcam: "QCAM.png",
  scotiabank: "Scotiabank.png",
  seb: "SEB.png",
  societegenerale: "Société Générale.png",
  unicredit: "UniCredit.png",
};

const normalizeLogoKey = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

const getInstitutionLogo = (name?: unknown) => {
  if (typeof name !== "string" || name.trim().length === 0) return null;
  const normalized = normalizeLogoKey(name);
  const fileName = notificationLogoFiles[normalized];

  if (!fileName) return null;

  return {
    src: `/assets/img/logos/notification-logos/${encodeURIComponent(fileName)}`,
    alt: name,
  };
};

  const handleSoundChange = (value: string) => {
    if (value !== preferences.notificationSoundId) {
      updatePreference("notificationSoundId", value);
    }
  };

  const getNotificationIcon = (icon: NotificationItem["icon"]) => {
    switch (icon) {
      case "chart":
        return <TrendingUp className="w-4 h-4 text-primary" />;
      case "file":
        return <FileText className="w-4 h-4 text-accent" />;
      case "alert":
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleRefresh = () => {
    fetchNotifications(activeTab, { force: true });
  };

  const fetchRealtimeNewsFilters = async () => {
    setLoadingFilters(true);
    try {
      const response = await fetch('/api/pmt/getRealtimeNewsFilters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch filters');
      }

      const data: { status: string; filters: RealtimeNewsFilters } = await response.json();
      if (data.status === '1' && data.filters) {
        setAvailableFilters(data.filters);
        // Initialize selected filters with all options
        setSelectedSections(new Set(data.filters.sections));
        setSelectedPriorities(new Set(data.filters.priorities));
      }
    } catch (error) {
      console.error('Error fetching realtime news filters:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  const fetchEventCalendarFilters = async () => {
    setLoadingFilters(true);
    try {
      const response = await fetch('/api/pmt/getEventCalendarFilters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch filters');
      }

      const data: { status: string; filters: EventCalendarFilters } = await response.json();
      if (data.status === '1' && data.filters) {
        setAvailableEventFilters(data.filters);
        // Initialize selected filters with all options
        setSelectedCurrencies(new Set(data.filters.currencies));
        setSelectedImportance(new Set(data.filters.importance));
      }
    } catch (error) {
      console.error('Error fetching event calendar filters:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  const saveRealtimeNewsFilters = async () => {
    try {
      const response = await fetch('/api/pmt/saveRealtimeNewsFilters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sections: Array.from(selectedSections),
          priorities: Array.from(selectedPriorities),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save filters');
      }

      console.log('Filters saved successfully');
      // Refresh notifications with new filters
      fetchNotifications(activeTab, { force: true });
    } catch (error) {
      console.error('Error saving realtime news filters:', error);
    }
  };

  const saveEventCalendarFilters = async () => {
    try {
      const response = await fetch('/api/pmt/saveEventCalendarFilters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currencies: Array.from(selectedCurrencies),
          importance: Array.from(selectedImportance),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save filters');
      }

      console.log('Event calendar filters saved successfully');
      // Refresh notifications with new filters
      fetchNotifications(activeTab, { force: true });
    } catch (error) {
      console.error('Error saving event calendar filters:', error);
    }
  };

  const handleFilterButtonClick = () => {
    if (activeTab === 'real-time-news') {
      fetchRealtimeNewsFilters();
      setShowFilterModal(true);
    } else if (activeTab === 'event-calendar') {
      fetchEventCalendarFilters();
      setShowFilterModal(true);
    }
  };

  const toggleSection = (section: string) => {
    setSelectedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const togglePriority = (priority: string) => {
    setSelectedPriorities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(priority)) {
        newSet.delete(priority);
      } else {
        newSet.add(priority);
      }
      return newSet;
    });
  };

  const toggleCurrency = (currency: string) => {
    setSelectedCurrencies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currency)) {
        newSet.delete(currency);
      } else {
        newSet.add(currency);
      }
      return newSet;
    });
  };

  const toggleImportance = (importance: string) => {
    setSelectedImportance(prev => {
      const newSet = new Set(prev);
      if (newSet.has(importance)) {
        newSet.delete(importance);
      } else {
        newSet.add(importance);
      }
      return newSet;
    });
  };

  const handleApplyFilters = async () => {
    if (activeTab === 'real-time-news') {
      await saveRealtimeNewsFilters();
    } else if (activeTab === 'event-calendar') {
      await saveEventCalendarFilters();
    }
    setShowFilterModal(false);
  };

  const handleClearAll = async () => {
    try {
      // Call the API to clear all notifications
      const response = await fetch('/api/pmt/clearAllNotifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tab: activeTab,
        }),
      });

      if (!response.ok) {
        console.error('Failed to clear notifications on server');
      }

      // Clear the local state regardless of API response
      setTabState((previous) => ({
        ...previous,
        [activeTab]: {
          ...previous[activeTab],
          items: [],
        },
      }));
    } catch (error) {
      console.error('Error clearing notifications:', error);
      // Still clear locally even if API call fails
      setTabState((previous) => ({
        ...previous,
        [activeTab]: {
          ...previous[activeTab],
          items: [],
        },
      }));
    }
  };

  const relativeTimestamps = useMemo(() => {
    return currentTabState.items.reduce<Record<string, string>>((accumulator, item) => {
      accumulator[item.id] = formatRelativeTime(item.createdAt);
      return accumulator;
    }, {});
  }, [currentTabState.items]);

  const renderEventValues = (
    metadata?: Record<string, string | number | null | undefined>,
  ) => {
    if (!metadata) return null;

    const actual = metadata.actual;
    const forecast = metadata.forecast;
    const previous = metadata.previous;

    const values: Array<{ label: string; value: EventValue; hideIfEmpty?: boolean }> = [
      { label: "Actual", value: actual },
      { label: "Forecast", value: forecast, hideIfEmpty: true },
      { label: "Previous", value: previous },
    ];

    if (
      !values.some((entry) => entry.value !== undefined && entry.value !== null && entry.value !== "")
    ) {
      return null;
    }

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map(({ label, value, hideIfEmpty }) => {
          if (hideIfEmpty && (value === null || value === undefined || value === "")) return null;
          return (
            <div
              key={label}
              className="flex min-w-[90px] flex-col gap-1 rounded-md border border-border/40 bg-popover/70 px-3 py-2 text-xs"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
              <span className={`text-sm font-semibold ${getEventValueClass(value)}`}>{formatEventValue(value)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 top-[42px] bg-black/40 z-40 transition-opacity" onClick={onClose} />}

      <div
        className={`fixed top-[42px] right-0 bottom-0 w-[460px] bg-widget-header border-l border-border z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="px-4 py-3 border-b border-border bg-widget-header">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base text-foreground">Notifications</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Select value={preferences.notificationSoundId} onValueChange={handleSoundChange}>
              <SelectTrigger className="h-8 w-[110px] text-xs justify-between">
                <SelectValue placeholder="Sound" />
              </SelectTrigger>
              <SelectContent>
                {soundOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-3 gap-2 ${
                preferences.notificationsOn
                  ? "text-primary hover:text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={handleToggleNotifications}
              title={preferences.notificationsOn ? "Notifications Loud" : "Notifications Silenced"}
            >
              {preferences.notificationsOn ? (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span className="text-xs">Loud</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span className="text-xs">Silence</span>
                </>
              )}
            </Button>

            <div className="flex items-center gap-2 h-8 px-3 rounded-md bg-popover/80">
              <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
              <Label htmlFor="mobile-push" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
                Mobile Push
              </Label>
              <Switch
                id="mobile-push"
                checked={preferences.notificationsOn}
                onCheckedChange={(checked) => {
                  if (checked !== preferences.notificationsOn) {
                    handleToggleNotifications();
                  }
                }}
                className="scale-75"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-background text-sm overflow-x-auto">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-popover"
              }`}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={`px-4 py-2 border-b border-border bg-background flex items-center justify-between transition-colors ${
          searchFieldFlash ? "animate-flash bg-primary/10" : ""
        }`}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            onClick={handleClearAll}
            disabled={currentTabState.items.length === 0}
            type="button"
          >
            <X className="w-3.5 h-3.5" />
            Clear all
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs text-muted-foreground hover:text-foreground" 
            type="button"
            onClick={handleFilterButtonClick}
            disabled={activeTab !== 'real-time-news' && activeTab !== 'event-calendar'}
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filter
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {currentTabState.loading && currentTabState.items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-sm text-muted-foreground">Loading notifications…</div>
            </div>
          ) : currentTabState.error && currentTabState.items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-sm text-muted-foreground">Failed to load notifications.</div>
              <div className="text-xs text-muted-foreground mt-1">{currentTabState.error}</div>
              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={handleRefresh} type="button">
                Try again
              </Button>
            </div>
          ) : currentTabState.items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="text-sm text-muted-foreground">No notifications</div>
            </div>
          ) : (
            currentTabState.items.map((notification) => {
              const isEventCalendar = activeTab === "event-calendar";
              const countryField = notification.metadata?.country;
              const country = typeof countryField === "string" ? countryField : null;
              const flag = isEventCalendar ? getCountryFlag(country) : "";

              const actual = parseNumericValue(notification.metadata?.actual ?? null);
              const previous = parseNumericValue(notification.metadata?.previous ?? null);
              const dotClass =
                actual !== null && previous !== null
                  ? actual > previous
                    ? "bg-success/80"
                    : actual < previous
                      ? "bg-destructive/80"
                      : "bg-muted-foreground/50"
                  : "bg-muted-foreground/50";
              const notificationType = notification.metadata?.notification_type;
              const instituteField = notification.metadata?.institute;
              const instituteName = typeof instituteField === "string" ? instituteField : undefined;
              const institutionLogo =
                notificationType === "s3_file" ? getInstitutionLogo(instituteName) : null;
              const showFlag = isEventCalendar && Boolean(flag);
              const showInstitutionLogo = !showFlag && institutionLogo;

              return (
                <div key={notification.id} className="px-4 py-3 border-b border-border hover:bg-popover transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-popover flex items-center justify-center flex-shrink-0">
                      {showFlag ? (
                        <span className="text-2xl leading-none">{flag}</span>
                      ) : showInstitutionLogo ? (
                        <Image
                          src={showInstitutionLogo.src}
                          alt={showInstitutionLogo.alt}
                          width={32}
                          height={32}
                          className="max-h-6 max-w-[26px] object-contain"
                        />
                      ) : (
                        getNotificationIcon(notification.icon)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4
                          className={`text-sm text-foreground ${
                            activeTab === "real-time-news" ? "" : "font-semibold"
                          }`}
                        >
                          {notification.title}
                        </h4>
                      </div>
                      {notification.description && 
                       notification.description.trim() !== "" && 
                       !notification.description.toLowerCase().includes("no description provided") && 
                       activeTab !== "event-calendar" && (
                        <p className="text-xs mb-2 line-clamp-3 text-foreground/70">
                          {notification.description}
                        </p>
                      )}
                      {isEventCalendar && renderEventValues(notification.metadata)}
                      <div className={`text-xs text-muted-foreground ${isEventCalendar ? "mt-2" : ""}`}>
                        {relativeTimestamps[notification.id] ?? formatRelativeTime(notification.createdAt)}
                      </div>
                    </div>
                    {(notification.isNew || isEventCalendar) && (
                      <div className="flex flex-col items-center justify-center gap-1 self-stretch">
                        {notification.isNew && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
                        )}
                        {isEventCalendar && (
                          <span className={`w-2.5 h-2.5 rounded-full ${dotClass} flex-shrink-0`}></span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Filter Slide-in Panel */}
      {showFilterModal && (
        <div className="fixed inset-0 top-[42px] bg-black/40 z-[60] transition-opacity" onClick={() => setShowFilterModal(false)} />
      )}
      <div
        className={`fixed top-[42px] right-0 bottom-0 w-[460px] bg-widget-header border-l border-border z-[60] transform transition-transform duration-300 ease-in-out flex flex-col ${
          showFilterModal ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="px-4 py-3 border-b border-border bg-widget-header">
          <div className="flex items-center justify-between">
            <h2 className="text-base text-foreground font-semibold">
              {activeTab === 'real-time-news' ? 'Real Time News Filters' : 'Event Calendar Filters'}
            </h2>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setShowFilterModal(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loadingFilters ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading filters...</div>
          </div>
        ) : activeTab === 'real-time-news' && availableFilters ? (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {/* Priorities Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-foreground">Priorities</h3>
                <div className="grid grid-cols-2 gap-3">
                  {availableFilters.priorities.map((priority) => (
                    <div key={priority} className="flex items-center space-x-2">
                      <Checkbox
                        id={`priority-${priority}`}
                        checked={selectedPriorities.has(priority)}
                        onCheckedChange={() => togglePriority(priority)}
                        className="rounded-none"
                      />
                      <Label
                        htmlFor={`priority-${priority}`}
                        className="text-sm cursor-pointer text-foreground"
                      >
                        {priority}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sections */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-foreground">Sections</h3>
                <div className="grid grid-cols-2 gap-3">
                  {availableFilters.sections.map((section) => (
                    <div key={section} className="flex items-center space-x-2">
                      <Checkbox
                        id={`section-${section}`}
                        checked={selectedSections.has(section)}
                        onCheckedChange={() => toggleSection(section)}
                        className="rounded-none"
                      />
                      <Label
                        htmlFor={`section-${section}`}
                        className="text-sm cursor-pointer text-foreground"
                      >
                        {section}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="px-4 py-3 border-t border-border bg-background flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-none"
                onClick={() => setShowFilterModal(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-none"
                onClick={handleApplyFilters}
                disabled={loadingFilters}
              >
                Apply Filters
              </Button>
            </div>
          </>
        ) : activeTab === 'event-calendar' && availableEventFilters ? (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {/* Importance Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-foreground">Importance</h3>
                <div className="grid grid-cols-3 gap-3">
                  {availableEventFilters.importance.map((importance) => {
                    const displayLabels: Record<string, string> = {
                      'low': 'Low',
                      'medium': 'Medium',
                      'high': 'High',
                      '1': 'Low',
                      '2': 'Medium',
                      '3': 'High'
                    };
                    const normalizedKey = String(importance).toLowerCase();
                    const displayLabel = displayLabels[normalizedKey] || importance;
                    
                    return (
                      <div key={importance} className="flex items-center space-x-2">
                        <Checkbox
                          id={`importance-${importance}`}
                          checked={selectedImportance.has(importance)}
                          onCheckedChange={() => toggleImportance(importance)}
                          className="rounded-none"
                        />
                        <Label
                          htmlFor={`importance-${importance}`}
                          className="text-sm cursor-pointer text-foreground flex items-center gap-2"
                        >
                          <Globe className="w-4 h-4" />
                          {displayLabel}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Currencies Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-foreground">Currencies</h3>
                <div className="grid grid-cols-2 gap-3">
                  {availableEventFilters.currencies.map((currency) => (
                    <div key={currency} className="flex items-center space-x-2">
                      <Checkbox
                        id={`currency-${currency}`}
                        checked={selectedCurrencies.has(currency)}
                        onCheckedChange={() => toggleCurrency(currency)}
                        className="rounded-none"
                      />
                      <Label
                        htmlFor={`currency-${currency}`}
                        className="text-sm cursor-pointer text-foreground"
                      >
                        {currency}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="px-4 py-3 border-t border-border bg-background flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-none"
                onClick={() => setShowFilterModal(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-none"
                onClick={handleApplyFilters}
                disabled={loadingFilters}
              >
                Apply Filters
              </Button>
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No filters available
          </div>
        )}
      </div>
    </>
  );
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.round(diffMs / 1000);

  if (diffSeconds < 5) return "Just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;

  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  const diffYears = Math.round(diffDays / 365);
  return `${diffYears}y ago`;
}

type EventValue = string | number | null | undefined;

function formatEventValue(value: EventValue): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return value.toString();
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "—";
}

function getEventValueClass(value: EventValue): string {
  const numeric = parseNumericValue(value);
  if (numeric === null) return "text-muted-foreground";
  if (numeric > 0) return "text-success";
  if (numeric < 0) return "text-destructive";
  return "text-muted-foreground";
}

function parseNumericValue(value: EventValue): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (Number.isNaN(value)) return null;
    return value;
  }

  const normalized = value.replace(/[^0-9+\-.,]/g, "").replace(/,/g, "");
  if (!normalized) return null;

  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function getCountryFlag(country?: string | null): string {
  if (!country) return "";

  const normalized = country.replace(/\s+/g, "_");

  const countryMap: Record<string, string> = {
    United_States: "🇺🇸",
    United_Kingdom: "🇬🇧",
    Germany: "🇩🇪",
    France: "🇫🇷",
    Spain: "🇪🇸",
    Italy: "🇮🇹",
    Japan: "🇯🇵",
    China: "🇨🇳",
    Australia: "🇦🇺",
    Canada: "🇨🇦",
    New_Zealand: "🇳🇿",
    Europe: "🇪🇺",
    Switzerland: "🇨🇭",
    Netherlands: "🇳🇱",
    Sweden: "🇸🇪",
    Norway: "🇳🇴",
    Denmark: "🇩🇰",
    Finland: "🇫🇮",
    Poland: "🇵🇱",
    Czech_Republic: "🇨🇿",
    Hungary: "🇭🇺",
    Austria: "🇦🇹",
    Belgium: "🇧🇪",
    Ireland: "🇮🇪",
    Portugal: "🇵🇹",
    Greece: "🇬🇷",
    Turkey: "🇹🇷",
    Russia: "🇷🇺",
    Brazil: "🇧🇷",
    Mexico: "🇲🇽",
    Argentina: "🇦🇷",
    Chile: "🇨🇱",
    Colombia: "🇨🇴",
    Peru: "🇵🇪",
    India: "🇮🇳",
    South_Korea: "🇰🇷",
    Singapore: "🇸🇬",
    Hong_Kong: "🇭🇰",
    Taiwan: "🇹🇼",
    Thailand: "🇹🇭",
    Malaysia: "🇲🇾",
    Indonesia: "🇮🇩",
    Philippines: "🇵🇭",
    Vietnam: "🇻🇳",
    South_Africa: "🇿🇦",
    Egypt: "🇪🇬",
    Nigeria: "🇳🇬",
    Kenya: "🇰🇪",
    Morocco: "🇲🇦",
    Saudi_Arabia: "🇸🇦",
    UAE: "🇦🇪",
    Qatar: "🇶🇦",
    Kuwait: "🇰🇼",
    Israel: "🇮🇱",
  };

  return countryMap[normalized] ?? "";
}


