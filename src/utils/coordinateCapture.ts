/**
 * Coordinate Capture Utility
 * 
 * Captures real-time coordinates from DOM elements for template saving.
 * This replaces the local storage approach with API-based coordinate capture.
 */

export interface WidgetInfo {
  name: string;
  position: string;
}

export interface CapturedWidget {
  WidgetTitle: string;
  Module: string;
  Symbols: string;
  AdditionalSettings: string;
  TopPos: number;
  LeftPos: number;
  Height: number;
  Width: number;
  position: string;
  zIndex: number;
}

export interface CoordinateCaptureResult {
  coordinates: CapturedWidget[];
  filledAreas: string;
}

/**
 * Widget mapping - maps widget IDs to display names and modules
 */
const WIDGET_MAPPING: Record<string, { title: string; module: string; settings: string }> = {
  'realtime-news-ticker': {
    title: 'Realtime News Ticker',
    module: 'News',
    settings: 'DAX,CAC,SMI,US Equities,Asian Equities,FTSE 100,European Equities,Global Equities,UK Equities,EUROSTOXX,US Equity Plus,US Data,Swiss Data,EU Data,Canadian Data,Other Data,UK Data,Other Central Banks,BoC,RBNZ,RBA,SNB,BoJ,BoE,ECB,PBoC,Fed,Bank Research,Fixed Income,Geopolitical,Rating Agency comments,Global News,Market Analysis,FX Flows,Asian News,Economic Commentary,Brexit,Energy & Power,Metals,Ags & Softs,Crypto,Emerging Markets,US Election,Trade,Newsquawk Update|Important,Rumour,Highlighted,Normal|selectAll'
  },
  'trading-chart': {
    title: 'Trading Chart',
    module: 'Forex',
    settings: '1D|NEWLAYOUT,Sample'
  },
  'currency-strength': {
    title: 'Currency Strength',
    module: 'Currency',
    settings: '{"currencies":["AUD","CAD","CHF","EUR","GBP","JPY","NZD","USD"],"timeframe":"TD","showVolume":1}'
  },
  'smart-money-report': {
    title: 'Smart Money Report',
    module: 'COT',
    settings: 'USD|Dealer Intermediary'
  },
  'seasonality-forecast': {
    title: 'Seasonality Forecast',
    module: 'Seasonality',
    settings: 'EURUSD|15Y'
  },
  'economic-calendar': {
    title: 'Economic Calendar',
    module: 'Calendar',
    settings: 'USD,EUR,GBP,JPY|today|1'
  },
  'market-overview': {
    title: 'Market Overview',
    module: 'Overview',
    settings: 'USD,EUR,GBP,JPY|today|1'
  }
};

/**
 * Capture coordinates for widgets in a template
 */
/**
 * Capture coordinates for free-floating widgets from localStorage
 */
export function captureFreeFloatingWidgetCoordinates(): CoordinateCaptureResult {
  const coordinates: CapturedWidget[] = [];
  const filledAreas: string[] = [];

  try {
    // Get free-floating widgets from localStorage
    const savedFloatingWidgets = localStorage.getItem('pmt_floating_widgets');
    if (!savedFloatingWidgets) {
      return { coordinates, filledAreas: '' };
    }

    const floatingWidgets = JSON.parse(savedFloatingWidgets);

    floatingWidgets.forEach((floatingWidget: any, index: number) => {
      try {
        // Get widget mapping info
        const widgetId = floatingWidget.widget?.id || floatingWidget.id;
        const mapping = WIDGET_MAPPING[widgetId] || {
          title: widgetId?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || `Widget ${index + 1}`,
          module: 'General',
          settings: ''
        };

        // Use the position and size from the floating widget
        const position = floatingWidget.position || { x: 50, y: 50 };
        const size = floatingWidget.size || { width: 400, height: 300 };

        // Create captured widget data
        const capturedWidget: CapturedWidget = {
          WidgetTitle: mapping.title,
          Module: mapping.module,
          Symbols: '', // Can be extended later
          AdditionalSettings: mapping.settings,
          TopPos: Math.round(position.y),
          LeftPos: Math.round(position.x),
          Height: Math.round(size.height),
          Width: Math.round(size.width),
          position: 'absolute',
          zIndex: 10 + index // Increment z-index for each widget
        };

        coordinates.push(capturedWidget);
        filledAreas.push('area-1'); // All free-floating widgets use area-1
      } catch (error) {
        // Error capturing free-floating widget
      }
    });

    return { 
      coordinates, 
      filledAreas: filledAreas.join(',') 
    };
  } catch (error) {
    return { coordinates, filledAreas: '' };
  }
}

export function captureWidgetCoordinates(
  widgets: WidgetInfo[],
  layout: string
): CoordinateCaptureResult {
  const coordinates: CapturedWidget[] = [];
  const filledAreas: string[] = [];

  widgets.forEach((widget, index) => {
    try {
      // Find the DOM element for this widget
      const element = findWidgetElement(widget.position);
      
      if (!element) {
        return;
      }

      // Get the bounding rectangle relative to the viewport
      const rect = element.getBoundingClientRect();
      
      // Get the dashboard container to calculate relative coordinates
      const dashboardContainer = document.querySelector('[data-dashboard-container]') || 
                                document.querySelector('.dashboard-container') ||
                                document.querySelector('#dashboard') ||
                                document.body;
      
      const containerRect = dashboardContainer.getBoundingClientRect();
      
      // Calculate coordinates relative to the dashboard container
      const relativeTop = rect.top - containerRect.top;
      const relativeLeft = rect.left - containerRect.left;
      
      // Get widget mapping info
      const mapping = WIDGET_MAPPING[widget.name] || {
        title: widget.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        module: 'General',
        settings: ''
      };

      // Create captured widget data with container-relative coordinates
      const capturedWidget: CapturedWidget = {
        WidgetTitle: mapping.title,
        Module: mapping.module,
        Symbols: '', // Can be extended later
        AdditionalSettings: mapping.settings,
        TopPos: Math.round(relativeTop),
        LeftPos: Math.round(relativeLeft),
        Height: Math.round(rect.height),
        Width: Math.round(rect.width),
        position: 'absolute',
        zIndex: 10 + index, // Increment z-index for layering
      };

      coordinates.push(capturedWidget);
      
      // Add to filled areas - use the actual widget position instead of sequential numbering
      filledAreas.push(widget.position);
    } catch (error) {
      // Error capturing coordinates for widget
    }
  });

  const result: CoordinateCaptureResult = {
    coordinates,
    filledAreas: filledAreas.join(',')
  };

  return result;
}

/**
 * Find the DOM element for a widget position
 */
function findWidgetElement(position: string): Element | null {
  // Try different selectors to find the element
  const selectors = [
    `[data-position="${position}"]`,
    `[data-area="${position}"]`,
    `[data-area="${position.replace('area-', 'area')}"]`,
    `.grid-area[data-position="${position}"]`,
    `.grid-area[data-area="${position}"]`,
    `#${position}`,
    `.${position}`,
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }

  // Fallback: try to find by class or other attributes
  const fallbackSelectors = [
    '.grid-area',
    '.widget-container',
    '.template-area',
    '.widget-panel',
    '[class*="area"]',
  ];

  for (const selector of fallbackSelectors) {
    const elements = document.querySelectorAll(selector);
    
    for (const element of elements) {
      // Check if this element contains the position in its attributes
      const attributes = Array.from(element.attributes);
      for (const attr of attributes) {
        if (attr.value.includes(position) || attr.value.includes(position.replace('area-', 'area'))) {
          return element;
        }
      }
      
      // Also check the element's class list
      if (element.classList.contains(position) || element.classList.contains(position.replace('area-', 'area'))) {
        return element;
      }
    }
  }

  return null;
}

/**
 * Get layout type from layout name
 */
export function getLayoutType(layout: string): string {
  return layout === 'free-floating' ? 'free-floating' : 'grid';
}

/**
 * Get display order for new templates
 */
export function getDisplayOrder(currentCount: number): number {
  return currentCount + 1;
}

/**
 * Validate that filledAreas count matches widgets count
 */
export function validateFilledAreas(filledAreas: string, widgetCount: number): boolean {
  const areas = filledAreas.split(',').filter(area => area.trim() !== '');
  return areas.length === widgetCount;
}

/**
 * Apply coordinates to a widget element
 * This is used when loading templates to restore widget positions and sizes
 */
export function applyWidgetCoordinates(element: Element, coordinates: {
  TopPos: number;
  LeftPos: number;
  Height: number;
  Width: number;
}): void {
  if (!element) return;
  
  const { TopPos, LeftPos, Height, Width } = coordinates;
  
  // Apply the coordinates as CSS styles
  (element as HTMLElement).style.position = 'absolute';
  (element as HTMLElement).style.top = `${TopPos}px`;
  (element as HTMLElement).style.left = `${LeftPos}px`;
  (element as HTMLElement).style.height = `${Height}px`;
  (element as HTMLElement).style.width = `${Width}px`;
}

/**
 * Debug function to log current widget positions
 * Useful for troubleshooting coordinate issues
 */
export function debugWidgetPositions(): void {
  // Debug function disabled - console logs removed
}
