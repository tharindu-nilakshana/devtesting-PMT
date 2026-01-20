// RealtimeHeadlineTickerWidget API functions and types
// Unified client-side and server-side functionality in a single file

import { postJSON } from '../../../../utils/api';
import { API_CONFIG } from '../../../../lib/api';
import { widgetDataCache } from '../../../../lib/widgetDataCache';

// Conditional import for server-side functionality
let cookies: typeof import('next/headers').cookies | null = null;
if (typeof window === 'undefined') {
  try {
    // Dynamic import for server-side only
    const nextHeaders = eval('require')('next/headers');
    cookies = nextHeaders.cookies;
  } catch {
    // cookies will remain null if not available
  }
}

// Types for realtime news ticker data - matching the original component exactly
export interface NewsItem {
  Id: number;
  newsdate: string;        // Full datetime string like "Fri, 05 Sep 2025 22:47:00"
  newsdateW: string;       // Formatted date like "Friday, September 05 2025"
  SectionName: string;     // Category like "Global News"
  Title: string;
  Content?: string;
  Reaction?: string;
  Analysis?: string;
  AnalysisUpdatedAt?: string;
  ReactionUpdatedAt?: string;
  Important?: boolean;
  Highlighted?: boolean;
  Rumour?: boolean;
  isNew?: boolean;         // For flashing animation on newly added items
  // Legacy fields for backward compatibility
  Time?: string;
  Section?: string;
}

export interface RealtimeNewsTickerRequest {
  GetRealtimeNewsTickerNew: number;
  SectionNames: string; // CSV
  NewsPriority: string; // CSV
  Page?: number;
  PageSize?: number;
  IsNotificationContext?: boolean;
}

export interface RealtimeNewsResponse {
  success: boolean;
  data: unknown;
  sectionsCsv: string;
  priorityCsv: string;
  page: number;
  pageSize: number;
  timestamp: number;
}

// Cache clearing function for news ticker
export async function clearRealtimeTickerCache(timeframe: string): Promise<void> {
  try {
    console.log('🗑️ [RealtimeNews] Starting cache clear for timeframe:', timeframe);
    
    const res = await fetch('/api/news/realtime-news-ticker/clear-cache', {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'segrW#$@dgnt547@'
      },
      credentials: 'include',
      body: JSON.stringify({ res: timeframe }),
    });
    
    console.log('🗑️ [RealtimeNews] Cache clear API response:', res.status, res.statusText);
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('❌ [RealtimeNews] Cache clear failed:', res.status, res.statusText, text);
      throw new Error(`Cache clear failed: ${res.status} ${res.statusText} ${text}`);
    }
    
    const responseData = await res.json();
    console.log('✅ [RealtimeNews] Cache cleared successfully for timeframe:', timeframe, responseData);
  } catch (error) {
    console.error('❌ [RealtimeNews] Cache clear error:', error);
    throw error;
  }
}

// Client-side API function
export async function fetchRealtimeNews(req: RealtimeNewsTickerRequest | Record<string, unknown>, clearCache: boolean = false) {
  try {
    // Generate cache key
    const cacheKey = widgetDataCache.generateKey('realtimenews', {
      sections: (req as RealtimeNewsTickerRequest).SectionNames,
      priority: (req as RealtimeNewsTickerRequest).NewsPriority,
      page: (req as RealtimeNewsTickerRequest).Page || 1
    });

    // Check cache first (unless clearCache is requested)
    if (!clearCache) {
      const cachedData = widgetDataCache.get<unknown>(cacheKey);
      if (cachedData) {
        console.log('📦 [RealtimeNews] Using cached data, skipping API call');
        return cachedData;
      }
    }

    // Clear cache first if requested
    if (clearCache) {
      console.log('🗑️ [RealtimeNews] Clearing cache before fetching data');
      // Use a default timeframe for news cache clearing
      await clearRealtimeTickerCache('1D');
    }

    const result = await postJSON<unknown>('getRealtimeNewsTicker', req);

    // Cache the result
    widgetDataCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('❌ [RealtimeNews] Error in fetchRealtimeNews:', error);
    throw error;
  }
}

// Server-side API functions (SSR compatible)
export async function getRealtimeNewsData(
  sectionsCsv?: string,
  priorityCsv?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<RealtimeNewsResponse | null> {
  // Only run on server-side
  if (typeof window !== 'undefined') {
    console.warn('getRealtimeNewsData should only be called on the server');
    return null;
  }

  if (!cookies) {
    console.warn('next/headers not available - getRealtimeNewsData cannot run');
    return null;
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;
    
    if (!token) {
      console.warn('No authentication token found for realtime news ticker data');
      return null;
    }

    // Call external PMT API directly, optimized for SSR speed
    const requestData = {
      GetRealtimeNewsTickerNew: 0, // Start from beginning for faster response
      SectionNames: sectionsCsv || 'DAX,CAC,SMI,US Equities,Asian Equities,FTSE 100,European Equities,Global Equities,UK Equities,EUROSTOXX,US Equity Plus,US Data,Swiss Data,EU Data,Canadian Data,Other Data,UK Data,Other Central Banks,BoC,RBNZ,RBA,SNB,BoJ,BoE,ECB,PBoC,Fed,Bank Research,Fixed Income,Geopolitical,Rating Agency comments,Global News,Market Analysis,FX Flows,Asian News,Economic Commentary,Brexit,Energy & Power,Metals,Ags & Softs,Crypto,Emerging Markets,US Election,Trade,Newsquawk Update',
      NewsPriority: priorityCsv || 'Important,Rumour,Highlighted,Normal',
      Page: page,
      PageSize: pageSize,
      IsNotificationContext: false
    };

    const response = await fetch(`${API_CONFIG.UPSTREAM_API}getRealtimeNewsTicker`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.error('Failed to fetch realtime news ticker data:', response.status);
      return null;
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data,
      sectionsCsv: sectionsCsv || '',
      priorityCsv: priorityCsv || '',
      page: page,
      pageSize: pageSize,
      timestamp: Date.now()
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('Realtime news ticker data fetch timed out after 5 seconds');
    } else {
      console.error('Error fetching realtime news ticker data:', error);
    }
    return null;
  }
}

export async function getRealtimeNewsDataForSSR(
  sectionsCsv?: string,
  priorityCsv?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<NewsItem[] | null> {
  const result = await getRealtimeNewsData(sectionsCsv, priorityCsv, page, pageSize);
  
  if (!result?.data) return null;
  
  // Process the data exactly like the original component does
  const payload = result.data as Record<string, unknown>;
  if (payload && (Array.isArray(payload.RealtimeNewsTicker) || Array.isArray(payload.NewsData))) {
    const raw = Array.isArray(payload.RealtimeNewsTicker) ? payload.RealtimeNewsTicker : payload.NewsData;
    
    const list: NewsItem[] = (raw as Record<string, unknown>[]).map((n: Record<string, unknown>) => ({
      Id: typeof n.id === 'number' ? n.id : typeof n.Id === 'number' ? n.Id : typeof n.ID === 'number' ? n.ID : 0,
      newsdate: typeof n.newsdate === 'string' ? n.newsdate : '',
      newsdateW: typeof n.newsdateW === 'string' ? n.newsdateW : '',
      SectionName: typeof n.SectionName === 'string' ? n.SectionName : '',
      Title: typeof n.Title === 'string' ? n.Title : '',
      Content: typeof n.Content === 'string' ? n.Content : '',
      Reaction: typeof n.ReactionDetails === 'string' ? n.ReactionDetails : typeof n.Reaction === 'string' ? n.Reaction : '',
      Analysis: typeof n.AnalysisDetails === 'string' ? n.AnalysisDetails : typeof n.Analysis === 'string' ? n.Analysis : '',
      Important: Boolean(n.Important),
      Highlighted: Boolean(n.Highlighted),
      Rumour: Boolean(n.Rumour),
      // Legacy fields for backward compatibility
      Time: typeof n.newsdate === 'string' ? n.newsdate : typeof n.Time === 'string' ? n.Time : '',
      Section: typeof n.SectionName === 'string' ? n.SectionName : typeof n.Section === 'string' ? n.Section : '',
    }));
    
    return list;
  }
  
  return null;
}

// Legacy functions for backward compatibility
// Moved from utils/realtimeNewsTicker.ts

// Global variable to store the latest news ID (equivalent to RealtimeNewsTickerID)
let RealtimeNewsTickerID = 0;

// Widget configuration storage (equivalent to RealtimenovWidgetOptions)
const RealtimenovWidgetOptions: Record<string, unknown> = {};

interface LegacyNewsItem {
  id: number;
  Title: string;
  Content: string;
  newsdate: string;
  newsdateW: string;
  SectionName: string;
  Important: number;
  Highlighted: number;
  Rumour: number;
  ReactionDetails?: string;
  AnalysisDetails?: string;
  ReactionUpdatedAt?: string;
  AnalysisUpdatedAt?: string;
}

interface LegacyNewsResponse {
  MaxID: number;
  MinID: number;
  HasMoreData: boolean;
  NewsData: LegacyNewsItem[];
}

/**
 * Main function following the legacy pattern:
 * fnRealtimeNewsTicker(maxid, AdditionalSettings, wgid, callback, page, isNotificationContext, $target, $clearButton)
 */
export async function fnRealtimeNewsTicker(
  maxid: number,
  AdditionalSettings: string,
  wgid: string,
  callback?: (data: LegacyNewsResponse) => void,
  page: number = 1,
  isNotificationContext: boolean = false,
  target?: HTMLElement | null,
): Promise<LegacyNewsResponse | void> {
  
  // Parse AdditionalSettings like the legacy code (format: "sections|priorities")
  const settingsParts = AdditionalSettings.split("|");
  const allowedSections = settingsParts[0];
  const newsPriority = settingsParts[1] || "Important,Rumour,Highlighted,Normal";
  
  // Page size logic matching legacy
  const pageSize = (page === 1) ? 300 : 50;
  
  try {
    // API call using our existing postJSON utility
    const requestData = {
      GetRealtimeNewsTickerNew: maxid,
      SectionNames: allowedSections,
      NewsPriority: newsPriority,
      Page: page,
      PageSize: pageSize,
      IsNotificationContext: isNotificationContext.toString()
    };
    
    const data = await postJSON<LegacyNewsResponse>('getRealtimeNewsTicker', requestData);

    if (!data || (typeof data === 'string' && data === "No Data")) {
      return;
    }

    // Update global RealtimeNewsTickerID (like legacy code)
    RealtimeNewsTickerID = (data as LegacyNewsResponse).MaxID;

    // If callback provided, use it (for async operations)
    if (callback) {
      callback(data as LegacyNewsResponse);
      return;
    }

    // Store configuration for this widget instance
    if (wgid) {
      if (!RealtimenovWidgetOptions[wgid]) {
        RealtimenovWidgetOptions[wgid] = {};
      }
      const responseData = data as LegacyNewsResponse;
      const options = RealtimenovWidgetOptions[wgid] as Record<string, unknown>;
      options.maxId = responseData.MaxID;
      options.minId = responseData.MinID;
      options.hasMoreData = responseData.HasMoreData;
      options.AdditionalSettings = AdditionalSettings;
    }

    // Render the news data to the target element
    if (target && wgid) {
      renderNewsToTarget(data as LegacyNewsResponse, target, wgid, page, isNotificationContext);
    }

    return data as LegacyNewsResponse;

  } catch (error) {
    console.error('[fnRealtimeNewsTicker] Error:', error);
    throw error;
  }
}

/**
 * Setup search functionality for the news ticker (following documentation)
 */
function setupSearchFunctionality(wgid: string, container: HTMLElement): void {
  const searchIcon = container.querySelector('.news-ticker-search-icon');
  const searchBar = container.querySelector('.news-ticker-search-bar') as HTMLInputElement;
  
  if (!searchIcon || !searchBar) return;
  
  // Toggle search bar visibility
  searchIcon.addEventListener('click', () => {
    searchBar.classList.toggle('hidden');
    if (!searchBar.classList.contains('hidden')) {
      searchBar.focus();
    } else {
      searchBar.value = '';
      clearSearch(wgid);
    }
  });
  
  // Search functionality on every keystroke
  searchBar.addEventListener('input', (e) => {
    const searchTerm = (e.target as HTMLInputElement).value.trim();
    
    if (searchTerm === '') {
      clearSearch(wgid);
    } else {
      filterNewsRows(searchTerm, wgid);
    }
  });
  
  // Close search on escape key
  searchBar.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchBar.classList.add('hidden');
      searchBar.value = '';
      clearSearch(wgid);
    }
  });
}

/**
 * Filter news rows based on search term (case-insensitive)
 */
function filterNewsRows(searchTerm: string, wgid: string): void {
  const container = document.querySelector(`[data-wgid="${wgid}"] .rowRealtimeNewsTicker`);
  if (!container) return;
  
  const searchLower = searchTerm.toLowerCase();
  const newsRows = container.querySelectorAll('.NewsRow');
  const dateHeaders = container.querySelectorAll('.NewsTickerDayTheDay');
  
  let visibleRowCount = 0;
  
  // Filter news rows
  newsRows.forEach((row) => {
    const titleElement = row.querySelector('.news-title');
    const contentElement = row.querySelector('.news-content');
    
    const titleText = titleElement?.textContent?.toLowerCase() || '';
    const contentText = contentElement?.textContent?.toLowerCase() || '';
    
    const isMatch = titleText.includes(searchLower) || contentText.includes(searchLower);
    
    if (isMatch) {
      (row as HTMLElement).style.display = '';
      visibleRowCount++;
    } else {
      (row as HTMLElement).style.display = 'none';
    }
  });
  
  // Show/hide date headers based on visible rows beneath them
  dateHeaders.forEach((header) => {
    const headerElement = header as HTMLElement;
    
    // Find all visible rows under this date header
    let hasVisibleRows = false;
    let currentElement = headerElement.nextElementSibling;
    
    while (currentElement) {
      if (currentElement.classList.contains('NewsTickerDayTheDay')) {
        // Hit next date header, stop checking
        break;
      }
      
      if (currentElement.classList.contains('NewsRow') && 
          (currentElement as HTMLElement).style.display !== 'none') {
        hasVisibleRows = true;
        break;
      }
      
      currentElement = currentElement.nextElementSibling;
    }
    
    // Show/hide header based on visible rows
    headerElement.style.display = hasVisibleRows ? '' : 'none';
  });
  
  // Update search results counter
  updateSearchResultsCounter(wgid, visibleRowCount);
}

/**
 * Update search results counter
 */
function updateSearchResultsCounter(wgid: string, count: number): void {
  const counter = document.querySelector(`[data-wgid="${wgid}"] .search-results-counter`);
  if (counter) {
    if (count > 0) {
      counter.textContent = `${count} search results`;
      counter.classList.remove('hidden');
    } else {
      counter.classList.add('hidden');
    }
  }
}

/**
 * Clear search and show all rows/headers
 */
function clearSearch(wgid: string): void {
  const container = document.querySelector(`[data-wgid="${wgid}"] .rowRealtimeNewsTicker`);
  if (!container) return;
  
  const newsRows = container.querySelectorAll('.NewsRow');
  const dateHeaders = container.querySelectorAll('.NewsTickerDayTheDay');
  
  // Show all news rows
  newsRows.forEach((row) => {
    (row as HTMLElement).style.display = '';
  });
  
  // Show all date headers
  dateHeaders.forEach((header) => {
    (header as HTMLElement).style.display = '';
  });
  
  // Hide search results counter
  updateSearchResultsCounter(wgid, 0);
}

/**
 * Render news data to target element (equivalent to HTML generation in legacy code)
 */
function renderNewsToTarget(
  data: LegacyNewsResponse, 
  target: HTMLElement, 
  wgid: string, 
  page: number, 
  isNotificationContext: boolean
): void {
  
  // Clear container on first page (like legacy code)
  if (page === 1 && !isNotificationContext) {
    const container = target.querySelector('.rowRealtimeNewsTicker');
    if (container) {
      container.innerHTML = '';
    }
  }

  let NewsDayPrevious = "";
  const newsContainer = target.querySelector('.rowRealtimeNewsTicker');
  if (!newsContainer) return;

  // Process each news item
  data.NewsData.forEach(objc => {
    // Add date header if different from previous (like legacy code)
    if (objc.newsdateW !== NewsDayPrevious && !isNotificationContext) {
      const dateHeader = document.createElement('div');
      dateHeader.className = 'NewsTickerDayTheDay px-3 py-2 text-sm font-medium text-white bg-orange-500 sticky top-0';
      dateHeader.setAttribute('data-date', objc.newsdateW);
      dateHeader.textContent = objc.newsdateW;
      newsContainer.appendChild(dateHeader);
      NewsDayPrevious = objc.newsdateW;
    }

    // Create news row
    const newsRow = document.createElement('div');
    newsRow.className = 'NewsRow grid grid-cols-[80px_120px_1fr] gap-3 p-3 border-b border-neutral-800 hover:bg-neutral-800/60 cursor-pointer transition-all duration-200';
    newsRow.setAttribute('data-newssection', objc.SectionName);
    newsRow.setAttribute('data-news-id', objc.id.toString());

    // Extract time from newsdate
    const timeStr = objc.newsdate.substring(16, 22);
    
    // Get category color
    const categoryColor = getCategoryTextColorLegacy(objc.SectionName);

    newsRow.innerHTML = `
      <div class="text-sm text-neutral-300 font-mono flex items-start pt-1">
        ${timeStr}
      </div>
      <div class="text-xs font-medium text-center flex items-start pt-1 ${categoryColor}">
        ${objc.SectionName}
      </div>
      <div class="min-w-0">
        <div class="news-title text-sm text-neutral-200 font-medium mb-1 line-clamp-2">
          ${objc.Title}
        </div>
        ${objc.Content ? `
          <div class="news-content text-sm text-neutral-300 line-clamp-2">
            ${objc.Content}
          </div>
          <div class="expand-hint text-xs text-neutral-500 mt-1">Click to expand...</div>
        ` : ''}
      </div>
    `;

    // Add click handler for expansion (following our React component logic)
    newsRow.addEventListener('click', () => {
      const titleElement = newsRow.querySelector('.news-title') as HTMLElement;
      const contentElement = newsRow.querySelector('.news-content') as HTMLElement;
      const expandHint = newsRow.querySelector('.expand-hint') as HTMLElement;
      
      const isExpanded = newsRow.classList.contains('expanded');
      
      if (isExpanded) {
        // Collapse
        newsRow.classList.remove('expanded');
        if (titleElement) titleElement.classList.add('line-clamp-2');
        if (contentElement) {
          contentElement.classList.add('line-clamp-2');
          contentElement.style.display = '';
        }
        if (expandHint) expandHint.style.display = objc.Content ? '' : 'none';
      } else {
        // Expand
        newsRow.classList.add('expanded');
        if (titleElement) titleElement.classList.remove('line-clamp-2');
        if (contentElement) {
          contentElement.classList.remove('line-clamp-2');
          contentElement.style.display = '';
        }
        if (expandHint) expandHint.style.display = 'none';
      }
    });

    newsContainer.appendChild(newsRow);
  });
  
  // Setup search functionality after rendering (only on first page)
  if (page === 1 && !isNotificationContext) {
    setupSearchFunctionality(wgid, target);
  }
}

/**
 * Helper function to get category text color (matches our existing implementation)
 */
function getCategoryTextColorLegacy(section: string): string {
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

/**
 * Get widget configuration for specific widget ID
 */
export function getRealtimeNewsWidgetOptions(wgid: string) {
  return RealtimenovWidgetOptions[wgid] || null;
}

/**
 * Set widget configuration for specific widget ID
 */
export function setRealtimeNewsWidgetOptions(wgid: string, options: unknown) {
  const existingOptions = RealtimenovWidgetOptions[wgid] || {};
  const newOptions = options as Record<string, unknown>;
  RealtimenovWidgetOptions[wgid] = { ...existingOptions, ...newOptions };
}

/**
 * Get current RealtimeNewsTickerID
 */
export function getRealtimeNewsTickerID(): number {
  return RealtimeNewsTickerID;
}

/**
 * Set RealtimeNewsTickerID
 */
export function setRealtimeNewsTickerID(id: number): void {
  RealtimeNewsTickerID = id;
}

/**
 * Export search functionality for external use
 */
export { setupSearchFunctionality, filterNewsRows, clearSearch, updateSearchResultsCounter };
