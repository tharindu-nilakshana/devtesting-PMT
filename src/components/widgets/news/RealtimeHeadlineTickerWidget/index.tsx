"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// WebSocket handled globally in WSBoot component
import { fetchRealtimeNews, clearRealtimeTickerCache } from './api';
import { fnRealtimeNewsTicker, setRealtimeNewsWidgetOptions } from './api';
import { NewsItem } from './api';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { Badge } from '@/components/ui/badge';
import widgetDataWebSocket from '@/utils/widgetWebSocket';
import { getUserTimezoneSync } from '@/utils/systemVariablesClient';

/**
 * RealtimeNewsTickerWidget - SSR-Enabled Version
 * 
 * ✅ SSR CONFIRMATION: This component fully conforms to Server-Side Rendering standards.
 * This widget loads instantly with SSR data and seamlessly transitions to client-side updates.
 */

interface WidgetSettings {
  newsSections?: string[];
  newsPriorities?: string[];
  [key: string]: unknown;
}

interface Props {
  sectionsCsv?: string;
  priorityCsv?: string;
  useLegacyPattern?: boolean; // Feature flag to use legacy fnRealtimeNewsTicker()
  wgid?: string;              // Widget ID for legacy pattern
  onRemove?: () => void;      // Close button functionality
  onSettings?: () => void;    // Settings button functionality
  onFullscreen?: () => void;  // Fullscreen functionality
  // SSR props
  initialData?: NewsItem[];
  ssrSectionsCsv?: string;
  ssrPriorityCsv?: string;
  // Settings from WidgetSettingsSlideIn
  settings?: WidgetSettings;
}

// Function to extract and convert time from datetime string to user's timezone
function extractTime(newsdate: string, userTimezone?: string): string {
  try {
    // Parse the datetime string like "Fri, 05 Sep 2025 22:47:00"
    const date = new Date(newsdate);
    
    // If date is invalid, try to extract time directly
    if (isNaN(date.getTime())) {
      const timeMatch = newsdate.match(/(\d{2}:\d{2})/);
      return timeMatch ? timeMatch[1] : newsdate;
    }
    
    // Convert to user's timezone if provided, otherwise use browser timezone
    const timeStr = date.toLocaleTimeString('en-US', {
      timeZone: userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return timeStr;
  } catch {
    return newsdate || '';
  }
}

// Function to get category text colors based on section name
function getCategoryTextColor(section?: string): string {
  if (!section) return 'text-neutral-400';
  
  const sectionLower = section.toLowerCase();
  
  if (sectionLower.includes('global') || sectionLower.includes('news')) {
    return 'text-blue-400';
  } else if (sectionLower.includes('energy') || sectionLower.includes('power')) {
    return 'text-green-400';
  } else if (sectionLower.includes('geopoliti') || sectionLower.includes('political')) {
    return 'text-red-400';
  } else if (sectionLower.includes('data') || sectionLower.includes('economic')) {
    return 'text-purple-400';
  } else if (sectionLower.includes('equities') || sectionLower.includes('stock')) {
    return 'text-indigo-400';
  } else if (sectionLower.includes('forex') || sectionLower.includes('currency')) {
    return 'text-yellow-400';
  } else if (sectionLower.includes('commodity') || sectionLower.includes('metal')) {
    return 'text-orange-400';
  } else {
    return 'text-neutral-400';
  }
}

// Function to generate tags from news item data
function generateTagsFromNewsItem(item: NewsItem): string[] {
  const tags: string[] = [];
  const title = (item.Title || '').toLowerCase();
  const section = (item.SectionName || item.Section || '').toLowerCase();
  
  // Add section-based tags
  if (section.includes('fed') || section.includes('central')) {
    tags.push('FED');
  }
  if (section.includes('equities') || section.includes('stock')) {
    tags.push('EQUITIES');
  }
  if (section.includes('energy') || section.includes('power')) {
    tags.push('ENERGY');
  }
  if (section.includes('geopoliti') || section.includes('political')) {
    tags.push('GEOPOLITICAL');
  }
  if (section.includes('data') || section.includes('economic')) {
    tags.push('DATA');
  }
  if (section.includes('forex') || section.includes('currency')) {
    tags.push('FOREX');
  }
  if (section.includes('commodity') || section.includes('metal')) {
    tags.push('COMMODITIES');
  }
  
  // Add content-based tags
  if (title.includes('cpi') || title.includes('inflation')) {
    tags.push('INFLATION');
  }
  if (title.includes('rate') || title.includes('interest')) {
    tags.push('RATES');
  }
  if (title.includes('earnings') || title.includes('profit')) {
    tags.push('EARNINGS');
  }
  if (title.includes('poll') || title.includes('survey')) {
    tags.push('POLL');
  }
  if (title.includes('analysis') || title.includes('outlook')) {
    tags.push('ANALYSIS');
  }
  if (item.Important) {
    tags.push('IMPORTANT');
  }
  if (item.Rumour) {
    tags.push('RUMOUR');
  }
  
  // Add region-based tags
  if (title.includes('us ') || title.includes('united states') || title.includes('america')) {
    tags.push('US');
  }
  if (title.includes('europe') || title.includes('euro')) {
    tags.push('EUROPE');
  }
  if (title.includes('asia') || title.includes('china') || title.includes('japan')) {
    tags.push('ASIA');
  }
  
  // Remove duplicates and limit to 3 tags max
  return [...new Set(tags)].slice(0, 3);
}

const DEFAULT_SECTIONS = 'DAX,CAC,SMI,US Equities,Asian Equities,FTSE 100,European Equities,Global Equities,UK Equities,EUROSTOXX,US Equity Plus,US Data,Swiss Data,EU Data,Canadian Data,Other Data,UK Data,Other Central Banks,BoC,RBNZ,RBA,SNB,BoJ,BoE,ECB,PBoC,Fed,Bank Research,Fixed Income,Geopolitical,Rating Agency comments,Global News,Market Analysis,FX Flows,Asian News,Economic Commentary,Brexit,Energy & Power,Metals,Ags & Softs,Crypto,Emerging Markets,US Election,Trade,Newsquawk Update';
const DEFAULT_PRIORITIES = 'Important,Rumour,Highlighted,Normal';

export default function RealtimeHeadlineTickerWidget({ 
  sectionsCsv: propSectionsCsv,
  priorityCsv: propPriorityCsv,
  useLegacyPattern = false, // Default to React pattern for better compatibility
  wgid = 'default-widget-id',
  onRemove,
  onSettings,
  onFullscreen,
  initialData,
  ssrSectionsCsv,
  ssrPriorityCsv,
  settings
}: Props) {
  // Derive sectionsCsv and priorityCsv from settings if available, otherwise use props or defaults
  // Important: if settings.newsSections exists but is empty, use DEFAULT_SECTIONS to avoid API errors
  const sectionsCsv = useMemo(() => {
    if (settings?.newsSections !== undefined) {
      const joined = settings.newsSections.join(',');
      // If empty, use defaults to avoid API "Missing SectionNames" error
      return joined || DEFAULT_SECTIONS;
    }
    return propSectionsCsv || DEFAULT_SECTIONS;
  }, [settings?.newsSections, propSectionsCsv]);

  const priorityCsv = useMemo(() => {
    if (settings?.newsPriorities !== undefined) {
      return settings.newsPriorities.join(',');
    }
    return propPriorityCsv || DEFAULT_PRIORITIES;
  }, [settings?.newsPriorities, propPriorityCsv]);

  const [items, setItems] = useState<NewsItem[]>(initialData || []);
  const [search, setSearch] = useState('');
  const [maxId, setMaxId] = useState<number>(0);
  const [minId, setMinId] = useState<number>(0); // Track MinID for pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [wsConnectionStatus, setWsConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [previousItemIds, setPreviousItemIds] = useState<Set<number>>(new Set());
  const [userTimezone, setUserTimezone] = useState<string>(getUserTimezoneSync);
  const [timezoneVersion, setTimezoneVersion] = useState(0); // Used to force re-render when timezone changes
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef<boolean>(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const legacyContainerRef = useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = useRef<boolean>(false);
  const loadImmediateRef = useRef<((initial?: boolean, forceRefresh?: boolean) => Promise<void>) | null>(null);
  // Track previous settings to detect user changes
  const prevSectionsCsvRef = useRef<string>(sectionsCsv);
  const prevPriorityCsvRef = useRef<string>(priorityCsv);
  
  // Global resize state to prevent API calls during window resize
  useEffect(() => {
    let globalResizeTimeout: NodeJS.Timeout | null = null;
    
    const handleGlobalResize = () => {
      isResizingRef.current = true;
      if (globalResizeTimeout) clearTimeout(globalResizeTimeout);
      globalResizeTimeout = setTimeout(() => {
        isResizingRef.current = false;
      }, 1500);
    };
    
    window.addEventListener('resize', handleGlobalResize);
    return () => {
      window.removeEventListener('resize', handleGlobalResize);
      if (globalResizeTimeout) clearTimeout(globalResizeTimeout);
    };
  }, []);

  // Listen for timezone changes from profile settings
  useEffect(() => {
    const handleTimezoneChange = (event: CustomEvent) => {
      const { timezoneName } = event.detail;
      if (timezoneName && timezoneName !== userTimezone) {
        console.log('[RealtimeNews] Timezone changed to:', timezoneName);
        setUserTimezone(timezoneName);
        // Increment version to force re-render of all time displays
        setTimezoneVersion(v => v + 1);
      }
    };

    window.addEventListener('timezoneChanged', handleTimezoneChange as EventListener);
    return () => window.removeEventListener('timezoneChanged', handleTimezoneChange as EventListener);
  }, [userTimezone]);

  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handler for Load More button
  const handleLoadMore = useCallback(async () => {
    if (isResizingRef.current || loadingMore || isLoadingMoreRef.current) {
      console.log('🚫 [RealtimeNews] Blocked Load More during resize or already loading');
      return;
    }

    const nextPage = page + 1;
    console.log('📰 [RealtimeNews] Loading more news - page:', nextPage);
    
    setLoadingMore(true);
    isLoadingMoreRef.current = true;
    
    // Create request for next page
    // Use minId from previous page to get older items (pagination works by using MinID as GetRealtimeNewsTickerNew)
    const nextPageReq = {
      GetRealtimeNewsTickerNew: minId || 0, // Use minId from previous page, or 0 if first load
      SectionNames: ssrSectionsCsv || sectionsCsv || DEFAULT_SECTIONS,
      NewsPriority: ssrPriorityCsv || priorityCsv || DEFAULT_PRIORITIES,
      Page: nextPage,
      PageSize: 50,
      IsNotificationContext: false,
    };

    try {
      console.log('📰 [RealtimeNews] Load More request:', nextPageReq);
      const data = await fetchRealtimeNews(nextPageReq as Record<string, unknown>, false);
      console.log('📰 [RealtimeNews] Load More response:', {
        hasData: !!data,
        dataKeys: data ? Object.keys(data as Record<string, unknown>) : [],
        hasRealtimeNewsTicker: !!(data as Record<string, unknown>)?.RealtimeNewsTicker,
        hasNewsData: !!(data as Record<string, unknown>)?.NewsData,
        maxID: (data as Record<string, unknown>)?.MaxID,
        hasMoreData: (data as Record<string, unknown>)?.HasMoreData,
        newsDataLength: Array.isArray((data as Record<string, unknown>)?.NewsData) ? ((data as Record<string, unknown>).NewsData as unknown[]).length : 0
      });
      
      // Prioritize NewsData (current API format) over RealtimeNewsTicker (legacy format)
      const itemsRaw: Record<string, unknown>[] = Array.isArray((data as Record<string, unknown>)?.NewsData)
        ? (data as Record<string, unknown>).NewsData as Record<string, unknown>[]
        : Array.isArray((data as Record<string, unknown>)?.RealtimeNewsTicker)
          ? (data as Record<string, unknown>).RealtimeNewsTicker as Record<string, unknown>[]
          : [];
      
      console.log('📰 [RealtimeNews] Load More - itemsRaw length:', itemsRaw.length);
      if (itemsRaw.length > 0) {
        console.log('📰 [RealtimeNews] Load More - first item:', {
          id: itemsRaw[0].id,
          Id: itemsRaw[0].Id,
          ID: itemsRaw[0].ID,
          title: itemsRaw[0].Title,
          newsdate: itemsRaw[0].newsdate
        });
      }
      
      const list: NewsItem[] = itemsRaw.map((n: Record<string, unknown>) => {
        const itemId = typeof n.id === 'number'
          ? n.id
          : typeof n.Id === 'number'
            ? n.Id
            : typeof n.ID === 'number'
              ? n.ID
              : 0;
        
        return {
          Id: itemId,
          newsdate: typeof n.newsdate === 'string' ? n.newsdate : '',
          newsdateW: typeof n.newsdateW === 'string' ? n.newsdateW : '',
          SectionName: typeof n.SectionName === 'string' ? n.SectionName : '',
          Title: typeof n.Title === 'string' ? n.Title : '',
          Content: typeof n.Content === 'string' ? n.Content : '',
          Time: typeof n.newsdate === 'string' ? n.newsdate : (typeof n.Time === 'string' ? n.Time : ''),
          Section: typeof n.SectionName === 'string' ? n.SectionName : (typeof n.Section === 'string' ? n.Section : ''),
          Reaction: typeof n.ReactionDetails === 'string' ? n.ReactionDetails : (typeof n.Reaction === 'string' ? n.Reaction : ''), 
          Analysis: typeof n.AnalysisDetails === 'string' ? n.AnalysisDetails : (typeof n.Analysis === 'string' ? n.Analysis : ''), 
          AnalysisUpdatedAt: typeof n.AnalysisUpdatedAt === 'string' ? n.AnalysisUpdatedAt : '',
          ReactionUpdatedAt: typeof n.ReactionUpdatedAt === 'string' ? n.ReactionUpdatedAt : '',
          Important: Boolean(n.Important), 
          Highlighted: Boolean(n.Highlighted), 
          Rumour: Boolean(n.Rumour),
          isNew: false, // Don't animate paginated items
        };
      });
      
      setMaxId((data as Record<string, unknown>)?.MaxID as number ?? maxId);
      const responseMinId = (data as Record<string, unknown>)?.MinID as number;
      if (responseMinId) {
        setMinId(responseMinId); // Update minId for next page pagination
      }
      setHasMore(Boolean((data as Record<string, unknown>)?.HasMoreData));
      
      // Append new items to existing ones
      setItems((prev) => {
        console.log('📰 [RealtimeNews] Current items count:', prev.length);
        console.log('📰 [RealtimeNews] New items from API:', list.length);
        const seen = new Set(prev.map(i => `${i.Id}|${i.Time || i.newsdate || ''}`));
        const deduped = list.filter(i => {
          const key = `${i.Id}|${i.Time || i.newsdate || ''}`;
          const isNew = !seen.has(key);
          if (!isNew) {
            console.log('📰 [RealtimeNews] Duplicate filtered:', { id: i.Id, time: i.Time || i.newsdate });
          }
          return isNew;
        });
        console.log('📰 [RealtimeNews] After deduplication:', deduped.length, 'new items');
        console.log('📰 [RealtimeNews] Sample new item IDs:', deduped.slice(0, 3).map(i => ({ id: i.Id, time: i.Time || i.newsdate })));
        console.log('📰 [RealtimeNews] Sample existing item IDs:', prev.slice(0, 3).map(i => ({ id: i.Id, time: i.Time || i.newsdate })));
        const newItems = [...prev, ...deduped];
        console.log('📰 [RealtimeNews] Final items count:', newItems.length);
        return newItems;
      });
      
      // Only update page state after successful load to avoid triggering useEffect
      setPage(nextPage);
    } catch (err) {
      console.error('❌ [RealtimeNews] Load More error:', err);
    } finally {
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [page, maxId, minId, ssrSectionsCsv, sectionsCsv, ssrPriorityCsv, priorityCsv, loadingMore]);

  // Create request object like the original component
  const req = useMemo(() => ({
    GetRealtimeNewsTickerNew: maxId,
    SectionNames: ssrSectionsCsv || sectionsCsv || DEFAULT_SECTIONS,
    NewsPriority: ssrPriorityCsv || priorityCsv || DEFAULT_PRIORITIES,
    Page: page,
    PageSize: 50,
    IsNotificationContext: false,
  }), [maxId, ssrSectionsCsv, sectionsCsv, ssrPriorityCsv, priorityCsv, page]);

  const loadImmediate = useCallback(async (initial: boolean = false, forceRefresh: boolean = false) => {
    // Block API calls during resize operations
    if (isResizingRef.current) {
      console.log('🚫 [RealtimeNews] Blocked API call during resize');
      return;
    }
    
    // console.log('📰 [RealtimeNews] Loading news data:', {
    //   initial,
    //   forceRefresh,
    //   maxId,
    //   page,
    //   sections: (req as Record<string, unknown>).SectionNames,
    //   priorities: (req as Record<string, unknown>).NewsPriority
    // });
    
    try {
      // Clear cache for WebSocket-triggered refreshes to get fresh data
      const shouldClearCache = forceRefresh && !initial;
      const data = await fetchRealtimeNews(req as Record<string, unknown>, shouldClearCache);
      
      const itemsRaw: Record<string, unknown>[] = Array.isArray((data as Record<string, unknown>)?.RealtimeNewsTicker)
        ? (data as Record<string, unknown>).RealtimeNewsTicker as Record<string, unknown>[]
        : Array.isArray((data as Record<string, unknown>)?.NewsData)
          ? (data as Record<string, unknown>).NewsData as Record<string, unknown>[]
          : [];
      
      
      // Debug: Log first item to see actual structure from primary API call
      if (itemsRaw.length > 0) {
      } else {
      }
      
      // Track new items to only animate the first one
      let hasNewItem = false;
      
      const list: NewsItem[] = itemsRaw.map((n: Record<string, unknown>) => {
        const itemId = typeof n.id === 'number'
          ? n.id
          : typeof n.Id === 'number'
            ? n.Id
            : typeof n.ID === 'number'
              ? n.ID
              : 0;
        
        // Check if this is a new item (not in previous items)
        const isNewItem = !previousItemIds.has(itemId);
        
        // Only mark the first new item as new to avoid all items flashing
        // BUT only animate if we have previous items (meaning this is a WebSocket update, not initial load)
        const shouldAnimate = isNewItem && !hasNewItem && previousItemIds.size > 0;
        if (isNewItem) {
          hasNewItem = true; // Mark that we've found a new item
          // console.log('🆕 [RealtimeNews] New item detected:', {
          //   id: itemId,
          //   title: typeof n.Title === 'string' ? n.Title : '',
          //   willAnimate: shouldAnimate,
          //   isInitialLoad: previousItemIds.size === 0,
          //   timestamp: new Date().toISOString()
          // });
        }
        
        return {
          Id: itemId,
          newsdate: typeof n.newsdate === 'string' ? n.newsdate : '',
          newsdateW: typeof n.newsdateW === 'string' ? n.newsdateW : '',
          SectionName: typeof n.SectionName === 'string' ? n.SectionName : '',
          Title: typeof n.Title === 'string' ? n.Title : '',                        // "Title": "US President Trump..."
          Content: typeof n.Content === 'string' ? n.Content : '',                    // "Content": "<ul>..."
          // Legacy fields for backward compatibility
          Time: typeof n.newsdate === 'string' ? n.newsdate : (typeof n.Time === 'string' ? n.Time : ''),
          Section: typeof n.SectionName === 'string' ? n.SectionName : (typeof n.Section === 'string' ? n.Section : ''),
          Reaction: typeof n.ReactionDetails === 'string' ? n.ReactionDetails : (typeof n.Reaction === 'string' ? n.Reaction : ''), 
          Analysis: typeof n.AnalysisDetails === 'string' ? n.AnalysisDetails : (typeof n.Analysis === 'string' ? n.Analysis : ''), 
          AnalysisUpdatedAt: typeof n.AnalysisUpdatedAt === 'string' ? n.AnalysisUpdatedAt : '',
          ReactionUpdatedAt: typeof n.ReactionUpdatedAt === 'string' ? n.ReactionUpdatedAt : '',
          Important: Boolean(n.Important), 
          Highlighted: Boolean(n.Highlighted), 
          Rumour: Boolean(n.Rumour),
          isNew: shouldAnimate, // Only mark the first new item for animation
        };
      });
      
      
      setMaxId((data as Record<string, unknown>)?.MaxID as number ?? 0);
      const responseMinId = (data as Record<string, unknown>)?.MinID as number;
      if (responseMinId) {
        setMinId(responseMinId); // Track MinID for pagination
      }
      setHasMore(Boolean((data as Record<string, unknown>)?.HasMoreData));
      setItems((prev) => {
        if (initial) {
          // console.log('📰 [RealtimeNews] Loaded initial news data:', list.length, 'items');
          // Update previous item IDs for initial load
          setPreviousItemIds(new Set(list.map(item => item.Id)));
          return list;
        }
        
        // For WebSocket updates (forceRefresh), detect truly new items
        if (forceRefresh) {
          console.log('📰 [RealtimeNews] WebSocket refresh - detecting new items:', list.length, 'items');
          // Reset previous item IDs to empty set so we can detect new items
          setPreviousItemIds(new Set());
          return list;
        }
        
        const seen = new Set(prev.map(i => `${i.Id}|${i.Time}`));
        const deduped = list.filter(i => !seen.has(`${i.Id}|${i.Time}`));
        console.log('📰 [RealtimeNews] Loaded additional news data:', deduped.length, 'new items');
        
        // Update previous item IDs to include new items
        setPreviousItemIds(prevIds => {
          const newIds = new Set(prevIds);
          list.forEach(item => newIds.add(item.Id));
          return newIds;
        });
        
        return [...prev, ...deduped];
      });
    } catch (err) {
      console.error('❌ [RealtimeNews] Fetch error:', err);
      // Fallback logic would go here if needed
    }
  }, [req, isResizingRef]);

  // Keep loadImmediate ref updated
  useEffect(() => {
    loadImmediateRef.current = loadImmediate;
  }, [loadImmediate]);

  // Auto-remove isNew flag after 3 seconds and dispatch global breaking news event
  useEffect(() => {
    // CRITICAL: Only dispatch events on client-side to avoid SSR issues
    if (typeof window === 'undefined') {
      return;
    }

    const newItems = items.filter(item => item.isNew);
    
    if (newItems.length > 0) {
      // Remove flash after 3 seconds
      const timeouts: NodeJS.Timeout[] = [];
      
      newItems.forEach(item => {
        const timeout = setTimeout(() => {
          setItems(prev => prev.map(prevItem => 
            prevItem.Id === item.Id 
              ? { ...prevItem, isNew: false }
              : prevItem
          ));
        }, 3000);
        
        timeouts.push(timeout);
      });
      
      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout));
      };
    }
  }, [items]);

  // Add resize detection
  useEffect(() => {
    if (containerRef.current) {
      const ro = new ResizeObserver(() => {
        // Set resize flag to block API calls
        isResizingRef.current = true;
        
        // Clear any existing timeout
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        
        // Set a timeout to detect when resize is complete
        resizeTimeoutRef.current = setTimeout(() => {
          isResizingRef.current = false;
        }, 1000); // 1000ms after last resize event
      });
      
      ro.observe(containerRef.current);
      
      return () => {
        ro.disconnect();
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
      };
    }
  }, []);

  useEffect(() => { 
    setPage(1); 
    // Only clear items if we don't have SSR data or if sections/priorities changed from SSR values
    if (!initialData || 
        (ssrSectionsCsv && sectionsCsv !== ssrSectionsCsv) || 
        (ssrPriorityCsv && priorityCsv !== ssrPriorityCsv)) {
      setItems([]); 
      setMaxId(0);
      setMinId(0);
    } else {
    }
  }, [sectionsCsv, priorityCsv, initialData, ssrSectionsCsv, ssrPriorityCsv]);

  // Detect settings changes from user interaction and trigger data reload
  useEffect(() => { 
    
    // Block API calls during resize operations or when loading more
    if (isResizingRef.current || loadingMore || isLoadingMoreRef.current) {
      return;
    }
    
    // Check if settings have changed from previous values (user updated settings)
    const sectionsChanged = sectionsCsv !== prevSectionsCsvRef.current;
    const prioritiesChanged = priorityCsv !== prevPriorityCsvRef.current;
    
    // Update refs to track current values
    prevSectionsCsvRef.current = sectionsCsv;
    prevPriorityCsvRef.current = priorityCsv;
    
    // Always load data if no SSR data, if this is a user-initiated settings change, or SSR values differ
    // Only load when page === 1 to avoid conflicts with Load More
    if (page === 1 && loadImmediateRef.current) {
      if (!initialData) {
        loadImmediateRef.current(true);
      } else if (sectionsChanged || prioritiesChanged) {
        // User changed settings - clear items and reload
        console.log('📰 [RealtimeNews] Settings changed, reloading data:', { sectionsChanged, prioritiesChanged });
        setItems([]);
        setMaxId(0);
        setMinId(0);
        loadImmediateRef.current(true, true); // Force refresh with cache clear
      } else if (ssrSectionsCsv && sectionsCsv !== ssrSectionsCsv) {
        loadImmediateRef.current(true);
      } else if (ssrPriorityCsv && priorityCsv !== ssrPriorityCsv) {
        loadImmediateRef.current(true);
      }
    }
  
}, [page, sectionsCsv, priorityCsv, initialData, ssrSectionsCsv, ssrPriorityCsv, loadingMore]); // User-initiated changes should be immediate

  // WebSocket connection management for real-time news updates
  useEffect(() => {
    // CRITICAL: Only connect WebSocket on client-side to avoid SSR issues
    if (typeof window === 'undefined') {
      console.log('🚫 [RealtimeNews] Skipping WebSocket connection during SSR');
      return;
    }

    const handleRealtimeData = (event: Event) => {
      const customEvent = event as CustomEvent<{
        widgetName: string; 
        data: any; 
        rawData: string; 
        timestamp: string;
      }>;
      const { widgetName, data } = customEvent.detail;
      
      console.log('📰 [RealtimeNews] Received WebSocket update:', {
        widgetName,
        hasData: !!data,
        data: data
      });
      
      // Check if this is a news-related update
      const isNewsUpdate = widgetName.toLowerCase().includes('realtimenews') || 
                          widgetName.toLowerCase().includes('news') ||
                          widgetName === 'realtimenews';
      
      if (isNewsUpdate) {
        console.log('📰 [RealtimeNews] Processing news update - triggering data refresh');
        setLastUpdateTime(new Date());
        
        // Block API calls during resize operations
        if (isResizingRef.current) {
          console.log('🚫 [RealtimeNews] Blocked WebSocket API call during resize');
          return;
        }
        
        console.log('🔄 [RealtimeNews] Refreshing news data due to WebSocket notification');
        loadImmediate(false, true); // Force refresh with cache clearing
      }
    };

    const connectWebSocket = async () => {
      try {
        console.log('🔗 [RealtimeNews] Setting up WebSocket connection...');
        
        // Set up connection status callback
        widgetDataWebSocket.onConnectionStatus((status) => {
          console.log('🔗 [RealtimeNews] WebSocket status:', status);
          setWsConnectionStatus(status);
        });

        // Set up widget update callback
        widgetDataWebSocket.onWidgetUpdate((widgetName) => {
          console.log('📨 [RealtimeNews] Received WebSocket update:', widgetName);
          
          // Check if this is a news-related update
          const isNewsUpdate = widgetName.toLowerCase().includes('realtimenews') || 
                             widgetName.toLowerCase().includes('news') ||
                             widgetName === 'realtimenews';
          
          if (isNewsUpdate) {
            // Block API calls during resize operations
            if (isResizingRef.current) {
              console.log('🚫 [RealtimeNews] Blocked WebSocket API call during resize');
              return;
            }
            
            console.log('🔄 [RealtimeNews] Refreshing data due to WebSocket update');
            setLastUpdateTime(new Date());
            loadImmediate(false, true); // Force refresh with cache clearing
          }
        });

        // Add event listener for detailed data
        window.addEventListener('pmt-widget-data', handleRealtimeData);

        // Connect to WebSocket with timeout handling
        await widgetDataWebSocket.connect();
        console.log('✅ [RealtimeNews] WebSocket connection established');
      } catch (error) {
        console.error('❌ [RealtimeNews] Failed to connect to WebSocket:', error);
        setWsConnectionStatus('error');
      }
    };

    // Connect with a small delay to ensure component is mounted
    const timeoutId = setTimeout(() => {
      connectWebSocket();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('pmt-widget-data', handleRealtimeData);
    };
  }, [loadImmediate]);

  // Legacy pattern support
  useEffect(() => {
    if (useLegacyPattern && wgid && legacyContainerRef.current) {
      try {
        // Set widget options for legacy pattern
        setRealtimeNewsWidgetOptions(wgid, {
          sections: ssrSectionsCsv || sectionsCsv,
          priorities: ssrPriorityCsv || priorityCsv
        });
        
        // Initialize legacy widget with proper AdditionalSettings format: "sections|priorities"
        const additionalSettings = `${ssrSectionsCsv || sectionsCsv}|${ssrPriorityCsv || priorityCsv}`;
        fnRealtimeNewsTicker(0, additionalSettings, wgid, undefined, 1, false, legacyContainerRef.current);
      } catch (error) {
        console.error('Failed to initialize legacy realtime news ticker:', error);
      }
    }
  }, [useLegacyPattern, wgid, sectionsCsv, priorityCsv, ssrSectionsCsv, ssrPriorityCsv]);


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    
    // Get the active priority settings (default to all if not specified)
    // Important: if settings.newsPriorities exists but is empty, respect that (show nothing)
    const activePriorities = settings?.newsPriorities !== undefined
      ? new Set(settings.newsPriorities)
      : new Set(DEFAULT_PRIORITIES.split(','));
    
    // Filter by search query first
    let base = q ? items.filter((i) => `${i.Title} ${i.Content ?? ''}`.toLowerCase().includes(q)) : items;
    
    // Then filter by priority settings - exclude items if ANY of their priority flags are unchecked
    // A news item can have multiple priority flags (e.g., Highlighted=1, Rumour=1, Important=1)
    // If any of those flags are unchecked in settings, filter out the item
    base = base.filter((item) => {
      // If the item has Important flag but Important is not selected, filter it out
      if (item.Important && !activePriorities.has('Important')) return false;
      // If the item has Highlighted flag but Highlighted is not selected, filter it out
      if (item.Highlighted && !activePriorities.has('Highlighted')) return false;
      // If the item has Rumour flag but Rumour is not selected, filter it out
      if (item.Rumour && !activePriorities.has('Rumour')) return false;
      // If the item is Normal (no special flags) but Normal is not selected, filter it out
      if (!item.Important && !item.Highlighted && !item.Rumour && !activePriorities.has('Normal')) return false;
      // If we get here, all of the item's priority flags are allowed by the settings
      return true;
    });
    
    // Group by newsdateW (formatted date like "Friday, September 05 2025")
    const grouped: Record<string, NewsItem[]> = {};
    for (const it of base) {
      const dateKey = it.newsdateW || it.Time || 'Unknown'; // Use newsdateW from API, fallback to legacy Time
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(it);
    }
    
    // Convert to ordered groups (latest date first)
    const keys = Object.keys(grouped).sort((a, b) => {
      // Try to parse dates for proper sorting
      const dateA = new Date(a.replace(/(\w+), (\w+ \d+ \d+)/, '$2'));
      const dateB = new Date(b.replace(/(\w+), (\w+ \d+ \d+)/, '$2'));
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return dateB.getTime() - dateA.getTime();
      }
      return b.localeCompare(a);
    });
    
    return keys.flatMap((k) => [{
      Id: -1, newsdateW: k, SectionName: 'header', Title: k, newsdate: '', Time: k, Section: 'header'
    } as unknown as NewsItem, 
    ...grouped[k].sort((a, b) => {
      // Sort by time descending within each date group
      const timeA = a.newsdate || a.Time || '';
      const timeB = b.newsdate || b.Time || '';
      return timeB.localeCompare(timeA);
    })]);
  }, [items, search, settings?.newsPriorities]);

  // Conditional rendering based on legacy pattern flag
  if (useLegacyPattern) {
    return (
      <div 
        ref={legacyContainerRef}
        className={`colDashboardSectionrealtime_news_ticker h-full w-full bg-neutral-900`}
        data-wgid={wgid}
      >
        <div className="DashboardSectionTitle px-3 py-2 bg-neutral-800 border-b border-neutral-700">
          <div className="DashboardSectionTitleText text-white font-medium"></div>
        </div>
        <div className="DashboardSection h-full"></div>
      </div>
    );
  }

  // Bloomberg-style UI implementation
  return (
    <div className="w-full h-full bg-widget-body border border-border rounded-none flex flex-col overflow-hidden">
      {/* Header - Bloomberg Style */}
      <WidgetHeader
        title={<span>News Ticker</span>}
        subtitle="Real-time Updates"
        onRemove={onRemove}
        onSettings={onSettings}
        onFullscreen={onFullscreen}
        helpContent="Bloomberg-style live news ticker with real-time market updates. Search and filter by category, source, or tags. Breaking news items are highlighted with red indicators for immediate attention."
      >
        <div className="flex items-center gap-1 mr-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              wsConnectionStatus === 'connected' ? 'bg-green-500' :
              wsConnectionStatus === 'connecting' ? 'bg-yellow-500' :
              wsConnectionStatus === 'error' ? 'bg-red-500' :
              'bg-gray-500'
            }`}
            title={`WebSocket: ${wsConnectionStatus}`}
          />
          {wsConnectionStatus === 'connected' && (
            <span className="text-xs text-green-500 hidden sm:inline">Live</span>
          )}
        </div>
      </WidgetHeader>


      {/* Search Bar */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <div className="relative flex-1">
          <svg 
            className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search news..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-full pl-8 text-xs bg-input-background border-border focus-visible:ring-primary text-foreground placeholder:text-muted-foreground border rounded px-2 outline-none focus:border-primary transition-colors"
          />
        </div>
        {search && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {filtered.filter(n => n.SectionName !== 'header' && n.Section !== 'header').length} items
                    </span>
        )}
      </div>

      {/* News List */}
      <div ref={containerRef} className="rowRealtimeNewsTicker flex-1 overflow-auto custom-scrollbar">
        <div className={`divide-y divide-border ${filtered.filter(n => n.SectionName !== 'header' && n.Section !== 'header').length === 0 ? 'h-full' : ''}`}>
          {filtered.map((n, idx) => {
            // Check if we need to show a day separator
            const prevItem = idx > 0 ? filtered[idx - 1] : null;
            const showDaySeparator = n.SectionName === 'header' || n.Section === 'header';

            return (
              <div key={`${n.Id ?? 'noid'}-${(n.newsdate || n.Time) ?? 'notime'}-${idx}-tz${timezoneVersion}`}>
                {/* Day Separator */}
                {showDaySeparator && (
                  <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-y border-border px-3 py-1.5">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      {n.newsdateW || n.Time || 'Unknown'}
                    </span>
                  </div>
                )}

                {/* News Item */}
                {!showDaySeparator && (
                  <div 
                    className={`hover:bg-muted/30 transition-all ${
                      n.isNew ? "animate-flash bg-primary/10" : ""
                    } ${
                      n.Important ? "border border-primary" : ""
                    }`}
                    style={n.Important ? { backgroundColor: 'color-mix(in oklab, var(--primary) 5%, transparent)' } : undefined}
                  >
                    <div 
                      className="grid grid-cols-[32px_50px_110px_1fr] gap-2 px-3 py-2.5 items-start cursor-pointer"
                      onClick={() => toggleRowExpansion(n.Id)}
                    >
                      {/* Priority Indicator */}
                      <div className="flex items-start justify-center pt-0.5">
                        {n.isNew && (
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" title="New item"></div>
                        )}
                        {n.Important && !n.isNew && (
                          <svg className="w-3 h-3 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
                            <circle cx="12" cy="12" r="3" fill="currentColor" />
                          </svg>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-sm text-muted-foreground pt-0.5 font-mono">
                        {extractTime(n.newsdate || n.Time || '', userTimezone)}
                      </div>

                      {/* Category */}
                      <div className={`text-sm pt-0.5 ${getCategoryTextColor(n.SectionName || n.Section)}`}>
                        {n.SectionName || n.Section || 'Unknown'}
                      </div>

                      {/* Headline and Tags */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5">
                          {/* Expand/Collapse Button */}
                          {(n.Content || n.Analysis || n.Reaction) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpansion(n.Id);
                              }}
                              className="flex-shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center text-foreground bg-border hover:bg-primary hover:text-primary-foreground transition-colors border border-border rounded"
                            >
                              <span className="text-sm font-bold leading-none">
                                {expandedRows.has(n.Id) ? "−" : "+"}
                              </span>
                            </button>
                          ) : (
                            <div className="w-4 flex-shrink-0" />
                          )}

                          {/* Headline */}
                          <p
                            className={`text-sm leading-relaxed font-bold ${
                              n.Important
                                ? "text-foreground"
                                : "text-foreground/90"
                            }`}
                            dangerouslySetInnerHTML={{ __html: n.Title || '' }}
                          />
                        </div>

                        {/* Tags - Bloomberg style below headline */}
                        {(() => {
                          const tags = generateTagsFromNewsItem(n);
                          return tags.length > 0 && (
                            <div className="flex gap-1.5 mt-1.5 ml-5">
                              {tags.map((tag, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className={`text-xs px-1.5 py-0 h-4 border-0 ${
                                    tag === "BREAKING" || tag === "ANALYSIS" || tag === "IMPORTANT"
                                      ? "bg-destructive/20 text-destructive" 
                                      : tag === "RUMOUR"
                                      ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                                      : "bg-muted/50 text-muted-foreground"
                                  }`}
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Content - Only show when expanded */}
                        {n.Content && expandedRows.has(n.Id) && (
                          <div className="mt-2 ml-5">
                            <div 
                              className="p-3 bg-success/10 border-l-2 border-success rounded text-base text-foreground/90 leading-relaxed [&_ul]:list-disc [&_ul]:ml-4 [&_li]:mb-1"
                              dangerouslySetInnerHTML={{ __html: n.Content }}
                            />
                          </div>
                        )}

                        {/* Analysis - Only show when expanded */}
                        {n.Analysis && expandedRows.has(n.Id) && (
                          <div className="mt-2 ml-5">
                            {n.AnalysisUpdatedAt && (
                              <div className="text-sm text-muted-foreground mb-1">
                                Analysis At: {extractTime(n.AnalysisUpdatedAt, userTimezone)}
                              </div>
                            )}
                            <div 
                              className="p-3 bg-blue-500/10 border-l-2 border-blue-500 rounded text-base text-foreground/90 leading-relaxed [&_ul]:list-disc [&_ul]:ml-4 [&_li]:mb-1"
                              dangerouslySetInnerHTML={{ __html: n.Analysis }}
                            />
                          </div>
                        )}

                        {/* Reaction - Only show when expanded */}
                        {n.Reaction && expandedRows.has(n.Id) && (
                          <div className="mt-2 ml-5">
                            {n.ReactionUpdatedAt && (
                              <div className="text-sm text-muted-foreground mb-1">
                                Reaction At: {extractTime(n.ReactionUpdatedAt, userTimezone)}
                              </div>
                            )}
                            <div 
                              className="p-3 bg-yellow-500/10 border-l-2 border-yellow-500 rounded text-base text-foreground/90 leading-relaxed [&_ul]:list-disc [&_ul]:ml-4 [&_li]:mb-1"
                              dangerouslySetInnerHTML={{ __html: n.Reaction }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* No News Message */}
          {filtered.filter(n => n.SectionName !== 'header' && n.Section !== 'header').length === 0 && (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <svg className="w-12 h-12 text-muted-foreground/50 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
              </svg>
              <p className="text-base text-muted-foreground text-center mb-1">No news available</p>
              <p className="text-sm text-muted-foreground/70 text-center">Try adjusting your filters or check back later</p>
            </div>
          )}
          
          {/* Load More Button - Only show if we have news items and there's more to load */}
          {hasMore && filtered.filter(n => n.SectionName !== 'header' && n.Section !== 'header').length > 0 && (
            <div className="p-3">
              <button 
                className="w-full px-3 py-2 bg-muted hover:bg-muted/80 border border-border text-foreground text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border bg-widget-header">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <svg className="w-2 h-2 text-destructive" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span className="text-xs text-muted-foreground">Breaking</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
            <span className="text-xs text-muted-foreground">Analysis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-destructive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="text-xs text-muted-foreground">High Priority</span>
          </div>
          {wsConnectionStatus === 'connected' && lastUpdateTime && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>              
            </div>
          )}
          {initialData && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span className="text-xs text-muted-foreground">SSR Data</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}