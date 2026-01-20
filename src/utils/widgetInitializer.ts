/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Widget Initializer - Following the legacy pattern from prime_dashboard.js
 * Handles widget detection logic with if (wgtl == "widget_type") pattern
 */

import { fnRealtimeNewsTicker, setRealtimeNewsWidgetOptions } from '../components/widgets/news/RealtimeHeadlineTickerWidget/api';
// Legacy currency strength import removed - now using React widget
import { storeEventCalendarWidgetOptions } from './globalWidgetOptions';

// Global variables to match legacy code
let FixedScrollOn = 1; // Global flag for scroll behavior
let GridDisplayOn = 1; // Global flag for grid display
let DarkBg = "#0a0a0a"; // Global theme

// Widget configuration storage (equivalent to RealtimenewsWidgetOptions)
const RealtimenewsWidgetOptions = new Map<string, Record<string, unknown>>();

// Mock global variables that would exist in legacy system
let RealtimeNewsTickerID = 0;
let ActiveSessionToken = '';

/**
 * Initialize widget based on type (wgtl) and widget ID (wgid)
 * This follows the exact pattern from prime_dashboard.js
 */
export async function initializeWidget(
  wgtl: string, 
  wgid: string, 
  obj: Record<string, unknown>, 
  container?: HTMLElement,
  wght?: number
): Promise<void> {
  
  // Get session token (would come from authentication in real app)
  if (typeof window !== 'undefined') {
    ActiveSessionToken = localStorage.getItem('pmt_auth_token') || '';
  }

  // Widget detection logic following legacy pattern
  if (wgtl === "realtime_news_ticker") {
    await initializeRealtimeNewsTicker(wgid, obj, container, wght);
  }
  
  // Legacy currency strength widget removed - now using React widget
  
  if (wgtl === "event_calendar") {
    await initializeEventCalendar(wgid, obj, container, wght);
  }
  
  // Add more widget types here following the same pattern
  // if (wgtl === "trading_view") { ... }
}

/**
 * Initialize Realtime News Ticker widget
 * Following the exact logic from prime_dashboard.js lines 3574-3667
 */
async function initializeRealtimeNewsTicker(
  wgid: string, 
  obj: Record<string, unknown>, 
  container?: HTMLElement,
  wght?: number
): Promise<void> {
  
  try {
    // Find or create the widget container elements
    const widgetContainer = container || document.querySelector(
      `.colDashboardSectionrealtime_news_ticker[data-wgid="${wgid}"]`
    );
    
    if (!widgetContainer) {
      console.warn(`[WidgetInitializer] Container not found for realtime_news_ticker wgid: ${wgid}`);
      return;
    }

    // Set up title with search functionality (following legacy pattern)
    const titleElement = widgetContainer.querySelector('.DashboardSectionTitle .DashboardSectionTitleText');
    if (titleElement) {
      titleElement.innerHTML = `
        Realtime News Ticker
        <i class="fas fa-search news-ticker-search-icon"></i>
        <input type="text" class="news-ticker-search-bar" placeholder="Search...">
      `;
    }

    // Create the main container with scroll settings (following legacy pattern)
    const dashboardSection = widgetContainer.querySelector('.DashboardSection');
    if (dashboardSection) {
      const height = GridDisplayOn === 1 ? "100%" : `${(wght || 400) - 20}px`;
      const scrollClass = FixedScrollOn === 1 ? "fixed-scroll-on" : "fixed-scroll-off";
      
      dashboardSection.innerHTML = `
        <div class="rowRealtimeNewsTicker ${scrollClass}" style="overflow:auto; height:${height};">
        </div>
      `;
    }

    // Set up search functionality (following legacy jQuery logic converted to vanilla JS)
    setupSearchFunctionality(wgid);

    // Store widget configuration (following legacy pattern)
    RealtimenewsWidgetOptions.set(wgid, {
      realtimeNewsTickerId: RealtimeNewsTickerID,
      additionalSettings: obj.AdditionalSettings
    });

    // Also store in our new system
    setRealtimeNewsWidgetOptions(wgid, {
      realtimeNewsTickerId: RealtimeNewsTickerID,
      additionalSettings: obj.AdditionalSettings
    });

    // Get the target container for rendering
    const targetContainer = widgetContainer.querySelector('.rowRealtimeNewsTicker') as HTMLElement;

    // Initialize the news ticker (following legacy function call)
    await fnRealtimeNewsTicker(
      RealtimeNewsTickerID,
      obj.AdditionalSettings as string,
      wgid,
      undefined, // callback
      1, // page
      false, // isNotificationContext
      targetContainer
    );


  } catch (error) {
    console.error(`[WidgetInitializer] Error initializing realtime_news_ticker for wgid: ${wgid}`, error);
  }
}

/**
 * Set up search functionality for news ticker
 * Converting legacy jQuery logic to vanilla JavaScript
 */
function setupSearchFunctionality(wgid: string): void {
  // Search icon click handler
  const searchIcon = document.querySelector(
    `.colDashboardSectionrealtime_news_ticker[data-wgid="${wgid}"] .news-ticker-search-icon`
  );
  
  if (searchIcon) {
    searchIcon.addEventListener('click', function(this: HTMLElement) {
      const searchBar = this.parentElement?.querySelector('.news-ticker-search-bar') as HTMLElement;
      if (searchBar) {
        searchBar.classList.toggle('visible');
        if (searchBar.classList.contains('visible')) {
          (searchBar as HTMLInputElement).focus();
        }
      }
    });
  }

  // Search input handler
  const searchBar = document.querySelector(
    `.colDashboardSectionrealtime_news_ticker[data-wgid="${wgid}"] .news-ticker-search-bar`
  ) as HTMLInputElement;

  if (searchBar) {
    searchBar.addEventListener('input', function() {
      const searchText = this.value.toLowerCase();
      const newsContainer = document.querySelector(
        `.colDashboardSectionrealtime_news_ticker[data-wgid="${wgid}"] .rowRealtimeNewsTicker`
      );

      if (!newsContainer) return;

      // Hide all news rows
      const newsRows = newsContainer.querySelectorAll('.NewsRow');
      newsRows.forEach(row => {
        (row as HTMLElement).style.display = 'none';
      });

      // Show matching rows
      newsRows.forEach(row => {
        const rowText = row.textContent?.toLowerCase() || '';
        if (rowText.indexOf(searchText) > -1) {
          (row as HTMLElement).style.display = '';
        }
      });

      // Handle date headers visibility
      const dateHeaders = newsContainer.querySelectorAll('.NewsTickerDayTheDay');
      dateHeaders.forEach(header => {
        const date = header.textContent?.trim() || '';
        const visibleNewsInSection = newsContainer.querySelectorAll(
          `.NewsRow[style=""]:not([style*="display: none"])`
        );
        
        let hasVisibleNews = false;
        visibleNewsInSection.forEach(newsRow => {
          if (newsRow.textContent?.includes(date)) {
            hasVisibleNews = true;
          }
        });

        (header as HTMLElement).style.display = hasVisibleNews ? '' : 'none';
      });

      // Show all if search is empty
      if (searchText === '') {
        newsRows.forEach(row => {
          (row as HTMLElement).style.display = '';
        });
        dateHeaders.forEach(header => {
          (header as HTMLElement).style.display = '';
        });
      }
    });
  }
}

/**
 * Set global flags (would be called from main app initialization)
 */
export function setGlobalFlags(flags: {
  FixedScrollOn?: number;
  GridDisplayOn?: number;
  DarkBg?: string;
}): void {
  if (flags.FixedScrollOn !== undefined) FixedScrollOn = flags.FixedScrollOn;
  if (flags.GridDisplayOn !== undefined) GridDisplayOn = flags.GridDisplayOn;
  if (flags.DarkBg !== undefined) DarkBg = flags.DarkBg;
}

/**
 * Get global flags
 */
export function getGlobalFlags() {
  return {
    FixedScrollOn,
    GridDisplayOn,
    DarkBg
  };
}

/**
 * Set RealtimeNewsTickerID (would be called when loading initial data)
 */
export function setRealtimeNewsTickerID(id: number): void {
  RealtimeNewsTickerID = id;
}

/**
 * Initialize Event Calendar widget
 * Following the exact logic from prime_dashboard.js lines 3669-3800+
 */
async function initializeEventCalendar(
  wgid: string, 
  obj: Record<string, unknown>, 
  container?: HTMLElement,
  wght?: number
): Promise<void> {
  
  try {
    // Find or create the widget container elements
    const widgetContainer = container || document.querySelector(
      `.colDashboardSectionevent_calendar[data-wgid="${wgid}"]`
    );
    
    if (!widgetContainer) {
      console.warn(`[WidgetInitializer] Container not found for event_calendar wgid: ${wgid}`);
      return;
    }

    // Parse additional settings following legacy pattern
    // const settings = obj.AdditionalSettings ? obj.AdditionalSettings.split('|') : [];
    // const symbols = settings[0] || 'USD,EUR,JPY,GBP,AUD,CHF,CAD,NZD';
    // const dateRange = settings[2] || 'DD/MM/YYYY - DD/MM/YYYY';
    // const eventOrientation = settings[3] || 'vertical';
    // const autoUpdateSettings = settings[4] || '1';

    // Special handling for widget ID "221684" (Details template)
    // const isSpecialWidget = wgid === '221684';
    
    // Set up title with options button (following legacy pattern)
    const titleElement = widgetContainer.querySelector('.DashboardSectionTitle .DashboardSectionTitleText');
    if (titleElement) {
      titleElement.innerHTML = `
        Event Calendar
        <button class="btn btn-sm btn-outline-secondary eventCalendarOptionsBtn" title="Column Settings">
          <i class="fa-solid fa-columns"></i>
        </button>
      `;
    }

    // Create the main container with scroll settings (following legacy pattern)
    const dashboardSection = widgetContainer.querySelector('.DashboardSection');
    if (dashboardSection) {
      const height = GridDisplayOn === 1 ? "100%" : `${(wght || 400) - 20}px`;
      const scrollClass = FixedScrollOn === 1 ? "fixed-scroll-on" : "fixed-scroll-off";
      
      dashboardSection.innerHTML = `
        <div class="divEventCalendarScrollable ${scrollClass}" style="overflow:auto; height:${height};">
          <div class="event-calendar-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Loading events...</span>
          </div>
        </div>
      `;
    }

    // Set up column settings functionality (following legacy jQuery logic converted to vanilla JS)
    setupEventCalendarColumnSettings(wgid);

    // Store widget configuration (following legacy pattern)
    storeEventCalendarWidgetOptions(wgid, {
      wgtl: 'event_calendar',
      wght: wght || 400,
      wgid: wgid,
      isInitialized: true
    });

    // Get the target container for rendering
    const targetContainer = widgetContainer.querySelector('.divEventCalendarScrollable') as HTMLElement;

    // Initialize the event calendar (following legacy function call pattern)
    await fnEventCalendar(wgid, obj, targetContainer);


  } catch (error) {
    console.error(`[WidgetInitializer] Error initializing event_calendar for wgid: ${wgid}`, error);
  }
}

/**
 * Set up column settings functionality for event calendar
 * Converting legacy jQuery logic to vanilla JavaScript
 */
function setupEventCalendarColumnSettings(wgid: string): void {
  // Column options button click handler
  const optionsBtn = document.querySelector(
    `.colDashboardSectionevent_calendar[data-wgid="${wgid}"] .eventCalendarOptionsBtn`
  );
  
  if (optionsBtn) {
    optionsBtn.addEventListener('click', function() {
      // Create or show column settings modal
      showColumnSettingsModal(wgid);
    });
  }
}

/**
 * Show column settings modal
 */
function showColumnSettingsModal(wgid: string): void {
  // Remove existing modal if any
  const existingModal = document.querySelector('.event-calendar-column-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'event-calendar-column-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h5>Column Settings</h5>
        <button class="btn-close" type="button"></button>
      </div>
      <div class="modal-body">
        <div class="form-check">
          <input class="form-check-input event-calendar-column-toggle" type="checkbox" id="time-${wgid}" data-column="time" checked>
          <label class="form-check-label" for="time-${wgid}">Time</label>
        </div>
        <div class="form-check">
          <input class="form-check-input event-calendar-column-toggle" type="checkbox" id="country-${wgid}" data-column="country" checked>
          <label class="form-check-label" for="country-${wgid}">Country</label>
        </div>
        <div class="form-check">
          <input class="form-check-input event-calendar-column-toggle" type="checkbox" id="currency-${wgid}" data-column="currency" checked>
          <label class="form-check-label" for="currency-${wgid}">Currency</label>
        </div>
        <div class="form-check">
          <input class="form-check-input event-calendar-column-toggle" type="checkbox" id="impact-${wgid}" data-column="impact" checked>
          <label class="form-check-label" for="impact-${wgid}">Impact</label>
        </div>
        <div class="form-check">
          <input class="form-check-input event-calendar-column-toggle" type="checkbox" id="event-${wgid}" data-column="event" checked>
          <label class="form-check-label" for="event-${wgid}">Event</label>
        </div>
        <div class="form-check">
          <input class="form-check-input event-calendar-column-toggle" type="checkbox" id="actual-${wgid}" data-column="actual" checked>
          <label class="form-check-label" for="actual-${wgid}">Actual</label>
        </div>
        <div class="form-check">
          <input class="form-check-input event-calendar-column-toggle" type="checkbox" id="forecast-${wgid}" data-column="forecast" checked>
          <label class="form-check-label" for="forecast-${wgid}">Forecast</label>
        </div>
        <div class="form-check">
          <input class="form-check-input event-calendar-column-toggle" type="checkbox" id="previous-${wgid}" data-column="previous" checked>
          <label class="form-check-label" for="previous-${wgid}">Previous</label>
        </div>
        <div class="form-check">
          <input class="form-check-input event-calendar-column-toggle" type="checkbox" id="high-${wgid}" data-column="high" checked>
          <label class="form-check-label" for="high-${wgid}">High</label>
        </div>
        <div class="form-check">
          <input class="form-check-input event-calendar-column-toggle" type="checkbox" id="low-${wgid}" data-column="low" checked>
          <label class="form-check-label" for="low-${wgid}">Low</label>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close modal handlers
  const backdrop = modal.querySelector('.modal-backdrop');
  const closeBtn = modal.querySelector('.btn-close');
  
  const closeModal = () => modal.remove();
  
  backdrop?.addEventListener('click', closeModal);
  closeBtn?.addEventListener('click', closeModal);

  // Column toggle handlers
  const toggles = modal.querySelectorAll('.event-calendar-column-toggle');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', function(this: HTMLInputElement) {
      const column = this.dataset.column;
      if (column) {
        toggleColumn(wgid, column, this.checked);
      }
    });
  });
}

/**
 * Toggle column visibility
 */
function toggleColumn(wgid: string, column: string, visible: boolean): void {
  const widgetContainer = document.querySelector(
    `.colDashboardSectionevent_calendar[data-wgid="${wgid}"]`
  );
  
  if (!widgetContainer) return;

  // Toggle table headers
  const headers = widgetContainer.querySelectorAll(`th[data-column="${column}"]`);
  headers.forEach(header => {
    (header as HTMLElement).style.display = visible ? '' : 'none';
  });

  // Toggle table cells
  const cells = widgetContainer.querySelectorAll(`td[data-column="${column}"]`);
  cells.forEach(cell => {
    (cell as HTMLElement).style.display = visible ? '' : 'none';
  });

}

/**
 * Main event calendar function (following legacy fnEventCalendar pattern)
 */
async function fnEventCalendar(wgid: string, obj: Record<string, unknown>, container: HTMLElement): Promise<void> {
  try {
    // Parse additional settings
    const additionalSettings = obj.AdditionalSettings as string || '';
    const settings = additionalSettings ? additionalSettings.split('|') : [];
    const symbols = settings[0] || 'USD,EUR,JPY,GBP,AUD,CHF,CAD,NZD';
    const dateRange = settings[2] || 'DD/MM/YYYY - DD/MM/YYYY';
    const eventOrientation = settings[3] || 'vertical';
    const autoUpdateSettings = settings[4] || '1';

    // Special handling for widget ID "221684"
    const isSpecialWidget = wgid === '221684';
    
    // Prepare request data
    const requestData = {
      symbols: symbols,
      dateRange: dateRange,
      eventOrientation: eventOrientation,
      autoUpdateSettings: autoUpdateSettings,
      templateName: obj.TemplateName || 'Default',
      wgid: wgid,
      isSpecialWidget: isSpecialWidget
    };

    // Fetch data from API
    const response = await fetch('/api/economic-data/event-calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      renderEventCalendar(container, result.data as Record<string, unknown>, eventOrientation);
    } else {
      throw new Error(result.error || 'Failed to fetch event calendar data');
    }

  } catch (error) {
    console.error('Error in fnEventCalendar:', error);
    container.innerHTML = `
      <div class="event-calendar-error">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <span>Failed to load events</span>
      </div>
    `;
  }
}

/**
 * Render event calendar data
 */
function renderEventCalendar(container: HTMLElement, data: Record<string, unknown>, orientation: string): void {
  const events = data.events as Array<Record<string, unknown>> || [];
  
  if (!events || events.length === 0) {
    container.innerHTML = `
      <div class="event-calendar-no-data">
        <i class="fa-solid fa-calendar"></i>
        <span>No events found</span>
      </div>
    `;
    return;
  }

  if (orientation === 'vertical') {
    renderVerticalMode(container, events);
  } else {
    renderHorizontalMode(container, events);
  }
}

/**
 * Render vertical mode (table layout)
 */
function renderVerticalMode(container: HTMLElement, events: Array<Record<string, unknown>>): void {
  const tableHtml = `
    <table class="table table-dark table-striped event-calendar-table">
      <thead class="table-header sticky-top">
        <tr>
          <th data-column="time">Time</th>
          <th data-column="country">Country</th>
          <th data-column="currency">Currency</th>
          <th data-column="impact">Impact</th>
          <th data-column="event">Event</th>
          <th data-column="actual">Actual</th>
          <th data-column="forecast">Forecast</th>
          <th data-column="previous">Previous</th>
          <th data-column="high">High</th>
          <th data-column="low">Low</th>
        </tr>
      </thead>
      <tbody>
        ${events.map(event => `
          <tr class="event-row">
            <td data-column="time">${event.NewsTime || '-'}</td>
            <td data-column="country">${event.Country || '-'}</td>
            <td data-column="currency">${event.Currency || '-'}</td>
            <td data-column="impact">
              <div class="impact-level">
                ${Array.from({ length: parseInt(String(event.Impact)) || 0 }).map(() => 
                  '<i class="fa-solid fa-globe"></i>'
                ).join('')}
                ${Array.from({ length: 3 - (parseInt(String(event.Impact)) || 0) }).map(() => 
                  '<i class="fa-solid fa-globe disabled"></i>'
                ).join('')}
              </div>
            </td>
            <td data-column="event">${event.Event || '-'}</td>
            <td data-column="actual">${event.Actual || '-'}</td>
            <td data-column="forecast">${event.Forecast || '-'}</td>
            <td data-column="previous">${event.Previous || '-'}</td>
            <td data-column="high">${event.High || '-'}</td>
            <td data-column="low">${event.Low || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = tableHtml;
}

/**
 * Render horizontal mode (multi-table layout)
 */
function renderHorizontalMode(container: HTMLElement, events: Array<Record<string, unknown>>): void {
  // Group events by date
  const groupedEvents: Record<string, Array<Record<string, unknown>>> = {};
  events.forEach(event => {
    const date = String(event.NewsDay || 'Unknown');
    if (!groupedEvents[date]) {
      groupedEvents[date] = [];
    }
    groupedEvents[date].push(event);
  });

  const tablesHtml = Object.entries(groupedEvents).map(([date, dateEvents]) => `
    <div class="daily-table-container">
      <div class="date-header">
        <span class="date-text">${date}</span>
        <span class="event-count">(${dateEvents.length})</span>
      </div>
      <table class="table table-dark table-striped daily-table">
        <thead>
          <tr>
            <th data-column="time">Time</th>
            <th data-column="country">Country</th>
            <th data-column="currency">Currency</th>
            <th data-column="impact">Impact</th>
            <th data-column="event">Event</th>
            <th data-column="actual">Actual</th>
            <th data-column="forecast">Forecast</th>
            <th data-column="previous">Previous</th>
            <th data-column="high">High</th>
            <th data-column="low">Low</th>
          </tr>
        </thead>
        <tbody>
          ${dateEvents.map(event => `
            <tr class="event-row">
              <td data-column="time">${event.NewsTime || '-'}</td>
              <td data-column="country">${event.Country || '-'}</td>
              <td data-column="currency">${event.Currency || '-'}</td>
              <td data-column="impact">
                <div class="impact-level">
                  ${Array.from({ length: parseInt(String(event.Impact)) || 0 }).map(() => 
                    '<i class="fa-solid fa-globe"></i>'
                  ).join('')}
                  ${Array.from({ length: 3 - (parseInt(String(event.Impact)) || 0) }).map(() => 
                    '<i class="fa-solid fa-globe disabled"></i>'
                  ).join('')}
                </div>
              </td>
              <td data-column="event">${event.Event || '-'}</td>
              <td data-column="actual">${event.Actual || '-'}</td>
              <td data-column="forecast">${event.Forecast || '-'}</td>
              <td data-column="previous">${event.Previous || '-'}</td>
              <td data-column="high">${event.High || '-'}</td>
              <td data-column="low">${event.Low || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `).join('');

  container.innerHTML = `<div class="horizontal-tables">${tablesHtml}</div>`;
}

/**
 * Get widget options for specific widget instance
 */
export function getWidgetOptions(wgid: string) {
  return RealtimenewsWidgetOptions.get(wgid);
}
