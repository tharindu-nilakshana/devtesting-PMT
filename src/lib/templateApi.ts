/**
 * Template API Service - External API Integration
 * 
 * This service handles all template operations using the external API.
 * It completely replaces local storage with API-based operations.
 */

// External API Response Interfaces
export interface MainGridPosition {
  ID: number;
  TemplateID: number;
  Top: string;
  Left: string;
  Height: string;
  Width: string;
}

export interface ExternalTemplatesResponse {
  Status: "Success";
  Templates: {
    CustomDashboardID: number;
    TemplateName: string;
    UpdatedOn: string;
    IsFavorite: number;
    isFreeFloating: number;
    icon: string;
    isActiveTab: number;
    DisplayOrder: number;
    templateType: string;
    layoutType: string;
    filledAreas: string;
    MainGridPosition?: MainGridPosition;
  }[];
}

export interface ExternalWidgetsResponse {
  Status: "Success";
  Widgets: {
    CustomDashboardWidgetID: number;
    CustomDashboardID: number;
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
    CustomTabsID?: number | null;
    accessStatus?: string;
  }[];
}

export interface UserCustomDashboardsResponse {
  status: "success";
  dashboards: {
    dashboardId: number;
    templateName: string;
    updatedOn: string;
    isFavorite: number;
    isFreeFloating: number;
    icon: string;
    isActiveTab: number;
    displayOrder: number;
    widgets: {
      widgetId: number;
      title: string;
      module: string;
      symbols: string;
      settings: string;
      topPos: number;
      leftPos: number;
      height: number;
      width: number;
      position: string;
      zIndex: number;
      customTabsID: number;
      accessStatus?: string;
    }[];
  }[];
}

export interface ExternalCreateResponse {
  Status: "Success";
  Message: string;
}

// Internal Application Interfaces
export interface TemplateWidget {
  id: string;
  name: string;
  position: string;
  settings?: Record<string, unknown>;
}

export interface UserTemplate {
  id: string;
  name: string;
  layout: string;
  saved: boolean;
  icon?: string;
  isFavorite?: boolean;
  displayOrder?: number;
  templateType?: string; // e.g., "Details", "Dashboard", etc.
  widgets: TemplateWidget[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTemplateRequest {
  TemplateName: string;
  Widgets: {
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
  }[];
  templateType: string;
  layoutType: string;
  filledAreas: string;
  isFavorite: boolean;
  displayOrder: number;
  isFreeFloating: boolean;
  icon: string;
  isActiveTab: boolean;
}

export interface CreateTemplateResponse {
  success: boolean;
  templateId?: string;
  message?: string;
}

// Response from createDetailsTemplateWeb API
export interface CreateDetailsTemplateResponse {
  Status: "Success" | "Error";
  Widgets?: {
    CustomDashboardWidgetID: number;
    CustomDashboardID: number;
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
    CustomTabsID?: number;
    TabDetails?: {
      CustomDashboardTabID: number;
      TabWidgetID: number;
      TabIcon: string;
      TabName: string;
      TabGrid: number;
      TabWidgetGap: number;
      TabOrder: number;
      IsPredefined: number;
      TabColor: string;
    };
  }[];
  Message?: string;
}

export interface CreateDetailsTemplateRequest {
  symbol: string;
  displayOrder: number;
}

export interface GetTemplatesResponse {
  success: boolean;
  templates?: UserTemplate[];
  message?: string;
}

import { getAuthToken } from '@/utils/api';

// localStorage keys for cache
const TEMPLATES_CACHE_KEY = 'pmt_templates_cache';
const WIDGETS_CACHE_PREFIX = 'pmt_widgets_cache_'; // Will be suffixed with templateId

// Helper functions for templates localStorage management
function getTemplatesFromCache(): ExternalTemplatesResponse | null {
  try {
    const cached = localStorage.getItem(TEMPLATES_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as ExternalTemplatesResponse;
      // Validate that the cached data has the expected structure
      if (parsed && parsed.Status === 'Success' && parsed.Templates && Array.isArray(parsed.Templates) && parsed.Templates.length > 0) {
        return parsed;
      } else {
        localStorage.removeItem(TEMPLATES_CACHE_KEY);
        return null;
      }
    }
  } catch (error) {
    // Clear corrupted cache
    try {
      localStorage.removeItem(TEMPLATES_CACHE_KEY);
    } catch (clearError) {
      // Error clearing corrupted cache
    }
  }
  return null;
}

function setTemplatesInCache(data: ExternalTemplatesResponse): void {
  try {
    localStorage.setItem(TEMPLATES_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    // Error saving templates to cache
  }
}

function clearTemplatesCache(): void {
  try {
    localStorage.removeItem(TEMPLATES_CACHE_KEY);
  } catch (error) {
    // Error clearing templates cache
  }
}

// Helper functions for widgets localStorage management
// Used to cache widgets per template to avoid unnecessary API calls when switching templates
function getWidgetsFromCache(templateId: number): ExternalWidgetsResponse | null {
  try {
    const cacheKey = `${WIDGETS_CACHE_PREFIX}${templateId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as ExternalWidgetsResponse;
      // Validate that the cached data has the expected structure
      if (parsed && parsed.Status === 'Success' && parsed.Widgets && Array.isArray(parsed.Widgets)) {
        return parsed;
      } else {
        localStorage.removeItem(cacheKey);
        return null;
      }
    }
  } catch (error) {
    // Clear corrupted cache
    try {
      const cacheKey = `${WIDGETS_CACHE_PREFIX}${templateId}`;
      localStorage.removeItem(cacheKey);
    } catch (clearError) {
      // Error clearing corrupted cache
    }
  }
  return null;
}

function setWidgetsInCache(templateId: number, data: ExternalWidgetsResponse): void {
  try {
    const cacheKey = `${WIDGETS_CACHE_PREFIX}${templateId}`;
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    // Error saving widgets to cache
  }
}

function clearWidgetsCache(templateId: number): void {
  try {
    const cacheKey = `${WIDGETS_CACHE_PREFIX}${templateId}`;
    localStorage.removeItem(cacheKey);
  } catch (error) {
    // Error clearing widgets cache
  }
}

function clearAllWidgetsCache(): void {
  try {
    // Clear all widget caches by iterating through localStorage keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(WIDGETS_CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    // Error clearing all widgets cache
  }
}

// Export clear functions for use in logout
export { clearTemplatesCache, clearAllWidgetsCache };

// Track recently created template names to avoid fetching widgets unnecessarily
const recentlyCreatedTemplates = new Set<string>();

/**
 * Add a template name to the recently created set
 * It will be automatically removed after 10 seconds
 */
function markTemplateAsRecentlyCreated(templateName: string): void {
  recentlyCreatedTemplates.add(templateName);
  // Auto-remove after 10 seconds
  setTimeout(() => {
    recentlyCreatedTemplates.delete(templateName);
  }, 10000);
}

/**
 * Check if a template was recently created
 */
function isTemplateRecentlyCreated(templateName: string): boolean {
  return recentlyCreatedTemplates.has(templateName);
}

/**
 * Clear all recently created template tracking
 * This can be used during logout or when needed to reset the tracking
 */
export function clearRecentlyCreatedTemplates(): void {
  recentlyCreatedTemplates.clear();
}

class TemplateApiService {
  private baseUrl = '/api/templates';

  /**
   * Map frontend layout names to API g-prefix names (when saving)
   */
  private mapFrontendToApiLayout(frontendLayout: string): string {
    const frontendToApiMapping: Record<string, string> = {
      // Special layouts
      'free-floating': 'free-floating',  // Free floating canvas

      // 1-cell layouts
      '1-grid': 'g11',              // Single cell

      // 2-cell layouts
      '2-grid-vertical': 'g21',     // 2 vertical columns
      '2-grid-horizontal': 'g22',   // 2 horizontal rows

      // 3-cell layouts
      '3-grid-left-large': 'g34',   // 1 left + 2 right stacked
      '3-grid-right-large': 'g36',  // 2 left + 1 right
      '3-grid-top-large': 'g35',    // 2 top + 1 bottom
      '3-grid-bottom-large': 'g33', // 1 top + 2 bottom
      '3-grid-rows': 'g31',         // 3 horizontal rows
      '3-grid-columns': 'g32',      // 3 vertical columns

      // 4-cell layouts
      '4-grid': 'g41',              // 2x2 grid
      '4-grid-columns': 'g42',      // 4 vertical columns
      '4-grid-rows': 'g43',         // 4 horizontal rows
      '4-grid-top-large': 'g44',    // 1 top + 3 bottom
      '4-grid-left-large': 'g45',   // 1 left + 3 right (right column has 3 rows)
      '4-grid-right-large': 'g46',  // 3 left + 1 right (left column has 3 rows)
      '4-grid-bottom-large': 'g47', // 3 top + 1 bottom (bottom row has 3 columns)

      // 5-cell layouts
      '5-grid-rows': 'g51',         // 5 horizontal rows
      '5-grid-columns': 'g52',      // 5 vertical columns
      '5-grid-complex': 'g53',      // Complex 5-cell layout

      // 6-cell layouts
      '6-grid-2x3': 'g61',          // 2x3 grid
      '6-grid-3x2': 'g62',          // 3x2 grid
      '6-grid-left-large': 'g64',   // 6-cell with large left panel

      // 7-cell layouts
      '7-grid-complex1': 'g71',     // Complex 7-cell layout 1
      '7-grid-complex2': 'g72',     // Complex 7-cell layout 2
      '7-grid-left': 'g73',         // 7-cell with left column
      '7-grid-large': 'g74',        // 7-cell with large panel

      // 8-cell layouts
      '8-grid-2x4': 'g81',          // 2x4 grid
      '8-grid-4x2': 'g82',          // 4x2 grid
      '8-grid-columns': 'g83',      // 8 vertical columns
      '8-grid-rows': 'g84',         // 8 horizontal rows

      // 9-cell layouts
      '9-grid': 'g91',              // 3x3 grid

      // 12-cell layouts
      '12-grid-3x4': 'g121',        // 3x4 grid
      '12-grid-4x3': 'g122',        // 4x3 grid

      // 16-cell layouts
      '16-grid': 'g161',            // 4x4 grid

      // 24-cell layouts
      '24-grid-4x6': 'g241',        // 4x6 grid
      '24-grid-6x4': 'g242',        // 6x4 grid
      '24-grid-3x8': 'g243',        // 3x8 grid
      '24-grid-8x3': 'g244',        // 8x3 grid

      // 28-cell layouts
      '28-grid-4x7': 'g281',        // 4x7 grid
      '28-grid-7x4': 'g282',        // 7x4 grid

      // 32-cell layouts
      '32-grid-4x8': 'g321',        // 4x8 grid
      '32-grid-8x4': 'g322',        // 8x4 grid
    };

    return frontendToApiMapping[frontendLayout] || frontendLayout;
  }

  /**
   * Map API g-prefix names to frontend layout names (when loading)
   */
  private mapApiToFrontendLayout(apiLayout: string): string {
    const apiToFrontendMapping: Record<string, string> = {
      // Special layouts
      'free-floating': 'free-floating',  // Free floating canvas

      // 1-cell layouts
      'g11': '1-grid',              // Single cell

      // 2-cell layouts
      'g21': '2-grid-vertical',     // 2 vertical columns
      'g22': '2-grid-horizontal',   // 2 horizontal rows

      // 3-cell layouts
      'g34': '3-grid-left-large',   // 1 left + 2 right stacked
      'g36': '3-grid-right-large',  // 2 left + 1 right
      'g35': '3-grid-top-large',    // 2 top + 1 bottom
      'g33': '3-grid-bottom-large', // 1 top + 2 bottom
      'g31': '3-grid-rows',         // 3 horizontal rows
      'g32': '3-grid-columns',      // 3 vertical columns

      // 4-cell layouts
      'g41': '4-grid',              // 2x2 grid
      'g42': '4-grid-columns',      // 4 vertical columns
      'g43': '4-grid-rows',         // 4 horizontal rows
      'g44': '4-grid-top-large',    // 1 top + 3 bottom
      'g45': '4-grid-left-large',   // 1 left + 3 right (right column has 3 rows)
      'g46': '4-grid-right-large',  // 3 left + 1 right (left column has 3 rows)
      'g47': '4-grid-bottom-large', // 3 top + 1 bottom (bottom row has 3 columns)

      // 5-cell layouts
      'g51': '5-grid-rows',         // 5 horizontal rows
      'g52': '5-grid-columns',      // 5 vertical columns
      'g53': '5-grid-complex',      // Complex 5-cell layout

      // 6-cell layouts
      'g61': '6-grid-2x3',          // 2x3 grid
      'g62': '6-grid-3x2',         // 6 horizontal rows
      'g64': '6-grid-left-large',   // 6-cell with large left panel

      // 7-cell layouts
      'g71': '7-grid-complex1',     // Complex 7-cell layout 1
      'g72': '7-grid-complex2',     // Complex 7-cell layout 2
      'g73': '7-grid-left',         // 7-cell with left column
      'g74': '7-grid-large',        // 7-cell with large panel

      // 8-cell layouts
      'g81': '8-grid-2x4',          // 2x4 grid
      'g82': '8-grid-4x2',          // 4x2 grid
      'g83': '8-grid-columns',      // 8 vertical columns
      'g84': '8-grid-rows',         // 8 horizontal rows

      // 9-cell layouts
      'g91': '9-grid',              // 3x3 grid

      // 12-cell layouts
      'g121': '12-grid-3x4',        // 3x4 grid
      'g122': '12-grid-4x3',        // 4x3 grid

      // 16-cell layouts
      'g161': '16-grid',            // 4x4 grid

      // 24-cell layouts
      'g241': '24-grid-4x6',        // 4x6 grid
      'g242': '24-grid-6x4',        // 6x4 grid
      'g243': '24-grid-3x8',        // 3x8 grid
      'g244': '24-grid-8x3',        // 8x3 grid

      // 28-cell layouts
      'g281': '28-grid-4x7',        // 4x7 grid
      'g282': '28-grid-7x4',        // 7x4 grid

      // 32-cell layouts
      'g321': '32-grid-4x8',        // 4x8 grid
      'g322': '32-grid-8x4',        // 8x4 grid
    };

    return apiToFrontendMapping[apiLayout] || apiLayout;
  }

  /**
   * Determine which area a widget belongs to based on filledAreas from template
   */
  private determineWidgetArea(widget: any, layoutType: string, index: number, filledAreas: string[]): string {
    // Use the widget's position field from the API if available
    // This ensures widgets are placed in the correct grid cells
    if (widget.position && typeof widget.position === 'string' && widget.position.trim() !== '') {

      return widget.position;
    }

    // Fallback: Use filledAreas from template to determine widget placement
    // The filledAreas array contains the actual areas where widgets are placed
    if (filledAreas && filledAreas.length > index) {

      return filledAreas[index];
    }

    // Final fallback to sequential numbering if filledAreas is not available or incomplete

    return `area-${index + 1}`;
  }

  private getAuthHeaders(): HeadersInit {
    const token = getAuthToken();

    if (!token) {
      throw new Error('No authentication token available');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get all templates for the authenticated user
   * This fetches template metadata and then gets widgets for each template
   * Uses localStorage cache - checks cache first, only calls API if cache is empty
   * @param forceRefresh - If true, bypasses cache and always fetches from API
   */
  async getTemplatesByUser(forceRefresh: boolean = false): Promise<UserTemplate[]> {
    try {
      // Step 1: Check localStorage cache first (unless forceRefresh is true)
      if (!forceRefresh) {
        const cachedData = getTemplatesFromCache();
        if (cachedData) {
          // Use cached data and continue with widget fetching (will use widget cache)
          const templatesData = cachedData;

          // Continue to process templates with widgets (will check widget cache per template)
          return await this.processTemplatesData(templatesData, false);
        }
      }

      // Step 2: Cache is empty or invalid, fetch from API
      const headers = this.getAuthHeaders();

      const templatesResponse = await fetch(`${this.baseUrl}/getTemplatesByUserWeb`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}), // Empty body as per the curl example
      });

      if (!templatesResponse.ok) {
        const errorText = await templatesResponse.text();
        throw new Error(`Failed to fetch templates: ${templatesResponse.statusText} - ${errorText}`);
      }

      const templatesData: ExternalTemplatesResponse = await templatesResponse.json();

      if (templatesData.Status !== "Success") {
        throw new Error('Failed to fetch templates from API');
      }

      // Step 3: Store API response in localStorage
      setTemplatesInCache(templatesData);

      // Continue to process templates with widgets (forceRefresh widgets too)
      return await this.processTemplatesData(templatesData, forceRefresh);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Process templates data and fetch widgets for each template
   * This is extracted to avoid code duplication
   * @param forceRefresh - If true, bypasses widget cache and fetches fresh from API
   */
  private async processTemplatesData(templatesData: ExternalTemplatesResponse, forceRefresh: boolean = false): Promise<UserTemplate[]> {
    // Fetch widgets for all templates in parallel for better performance
    // IMPORTANT: Don't force refresh widgets when only templates are being refreshed
    // The widget cache for each template is cleared individually when that template is modified
    const widgetPromises = templatesData.Templates.map(template => 
      this.getWidgetsByTemplate(template.CustomDashboardID, false) // Always use cache, it's cleared when needed
        .catch(error => {
          console.error(`Failed to fetch widgets for template ${template.CustomDashboardID}:`, error);
          return []; // Return empty array on error to not block other templates
        })
    );

    // Wait for all widget fetches to complete
    const allWidgets = await Promise.all(widgetPromises);

    // Process each template with its widgets
    const templatesWithWidgets: UserTemplate[] = [];

    for (let i = 0; i < templatesData.Templates.length; i++) {
      const template = templatesData.Templates[i];
      const widgets = allWidgets[i];

      try {
        const mappedLayout = this.mapApiToFrontendLayout(template.templateType);

        // Parse filledAreas string into array first to check if template has widgets
        const filledAreas = template.filledAreas ? template.filledAreas.split(',').filter(area => area.trim() !== '') : [];

        // Transform external API format to internal format
        const userTemplate: UserTemplate = {
          id: template.CustomDashboardID.toString(),
          name: template.TemplateName,
          layout: mappedLayout, // Use the mapped frontend layout
          saved: true, // All templates from API are saved
          icon: template.icon || 'Star',
          isFavorite: template.IsFavorite === 1,
          // IMPORTANT: Details templates should never be hidden (displayOrder: -1)
          // If backend returns -1 for a details template, we need to fix it
          // For now, preserve the backend value and handle restoration in the UI
          displayOrder: template.DisplayOrder,
          templateType: template.templateType, // Preserve templateType (e.g., "Details")
          widgets: widgets.map((widget, index) => {
            // Determine the correct area based on filledAreas from template
            const area = this.determineWidgetArea(widget, template.templateType, index, filledAreas);
            // Normalize accessStatus to lowercase for consistent checking
            const accessStatus = typeof widget.accessStatus === 'string'
              ? widget.accessStatus.trim().toLowerCase()
              : undefined;

            // Handle both API response formats: getWidgetsByTemplateWeb uses CustomDashboardWidgetID,
            // getUserCustomDashboardsWeb uses widgetId
            const widgetIdField = widget.CustomDashboardWidgetID ?? (widget as any).widgetId;

            const widgetName = widget.WidgetTitle.toLowerCase().replace(/\s+/g, '-');

            return {
              id: `${template.CustomDashboardID}-${widgetIdField}`,
              name: widgetName,
              position: area,
              settings: {
                module: widget.Module,
                symbols: widget.Symbols,
                additionalSettings: widget.AdditionalSettings,
                coordinates: {
                  top: widget.TopPos,
                  left: widget.LeftPos,
                  width: widget.Width,
                  height: widget.Height,
                },
                zIndex: widget.zIndex,
                customDashboardWidgetID: widgetIdField, // Use the resolved widget ID
                customTabsID: widget.CustomTabsID,
                // Store normalized accessStatus (e.g., "No Access" -> "no access")
                ...(accessStatus ? { accessStatus } : {})
              }
            };
          }),
          createdAt: template.UpdatedOn,
          updatedAt: template.UpdatedOn,
        };

        templatesWithWidgets.push(userTemplate);
      } catch (error) {
        console.error(`Failed to process template ${template.CustomDashboardID}:`, error);
        // Continue with other templates even if one fails
      }
    }

    // Sort templates by DisplayOrder (ascending: 1, 2, 3, 4, ...)
    const sortedTemplates = templatesWithWidgets.sort((a, b) => {
      // Get DisplayOrder from the original template data
      const templateA = templatesData.Templates.find(t => t.CustomDashboardID.toString() === a.id);
      const templateB = templatesData.Templates.find(t => t.CustomDashboardID.toString() === b.id);

      const orderA = templateA?.DisplayOrder || 999; // Default to high number for templates without order
      const orderB = templateB?.DisplayOrder || 999;

      return orderA - orderB;
    });

    return sortedTemplates;
  }

  /**
   * Get user custom dashboards with widgets included
   * This endpoint returns dashboards with widgets already included in the response
   */
  async getUserCustomDashboards(): Promise<UserCustomDashboardsResponse> {
    try {
      const headers = this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/getUserCustomDashboardsWeb`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch user custom dashboards: ${response.statusText} - ${errorText}`);
      }

      const data: UserCustomDashboardsResponse = await response.json();

      if (data.status !== "success") {
        throw new Error('Failed to fetch user custom dashboards from API');
      }

      // Normalize accessStatus for all widgets in all dashboards
      const normalizedData: UserCustomDashboardsResponse = {
        ...data,
        dashboards: data.dashboards.map(dashboard => ({
          ...dashboard,
          widgets: dashboard.widgets.map(widget => ({
            ...widget,
            // Normalize accessStatus to lowercase for consistent checking
            accessStatus: typeof widget.accessStatus === 'string'
              ? widget.accessStatus.trim().toLowerCase()
              : widget.accessStatus
          }))
        }))
      };

      return normalizedData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get widgets for a specific template
   * Checks localStorage cache first, only calls API if cache is empty or doesn't exist
   * Cache is invalidated when widgets are added/removed/updated
   */
  async getWidgetsByTemplate(templateId: number, forceRefresh: boolean = false): Promise<ExternalWidgetsResponse['Widgets']> {
    try {
      // Check cache first (unless forceRefresh is true)
      if (!forceRefresh) {
        const cachedData = getWidgetsFromCache(templateId);
        if (cachedData) {
          return cachedData.Widgets;
        }
      }

      const headers = this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/getWidgetsByTemplateWeb`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ templateId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch widgets: ${response.statusText} - ${errorText}`);
      }

      const data: ExternalWidgetsResponse = await response.json();

      if (data.Status !== "Success") {
        throw new Error('Failed to fetch widgets from API');
      }

      // Cache the result
      setWidgetsInCache(templateId, data);

      return data.Widgets;
    } catch (error) {
      console.error(`❌ [TemplateApi] Error fetching widgets for template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Refresh widgets for a specific template only
   * This is more efficient than refreshing all templates when only one template's widgets changed
   * Returns the updated UserTemplate with fresh widgets from API
   */
  async refreshTemplateWidgets(templateId: string): Promise<UserTemplate | null> {
    try {
      const numericTemplateId = parseInt(templateId, 10);
      if (isNaN(numericTemplateId)) {
        throw new Error(`Invalid template ID: ${templateId}`);
      }

      // Get templates from cache, or fetch if not cached
      let cachedTemplates = getTemplatesFromCache();
      if (!cachedTemplates) {
        // Cache doesn't exist (might have been cleared), fetch templates list first
        const headers = this.getAuthHeaders();
        const templatesResponse = await fetch(`${this.baseUrl}/getTemplatesByUserWeb`, {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });

        if (!templatesResponse.ok) {
          const errorText = await templatesResponse.text();
          throw new Error(`Failed to fetch templates: ${templatesResponse.statusText} - ${errorText}`);
        }

        cachedTemplates = await templatesResponse.json();

        if (cachedTemplates.Status !== "Success") {
          throw new Error('Failed to fetch templates from API');
        }

        // Store in cache for future use
        setTemplatesInCache(cachedTemplates);
      }

      // Find the template in cached data
      const templateData = cachedTemplates.Templates.find(t => t.CustomDashboardID === numericTemplateId);
      if (!templateData) {
        throw new Error(`Template ${templateId} not found in cache`);
      }

      // Fetch fresh widgets from API (bypass cache)
      const widgets = await this.getWidgetsByTemplate(numericTemplateId, true);

      // Process the template with fresh widgets
      const mappedLayout = this.mapApiToFrontendLayout(templateData.templateType);
      const filledAreas = templateData.filledAreas ? templateData.filledAreas.split(',').filter(area => area.trim() !== '') : [];

      const updatedTemplate: UserTemplate = {
        id: templateData.CustomDashboardID.toString(),
        name: templateData.TemplateName,
        layout: mappedLayout,
        saved: true,
        icon: templateData.icon || 'Star',
        isFavorite: templateData.IsFavorite === 1,
        displayOrder: templateData.DisplayOrder,
        templateType: templateData.templateType,
        widgets: widgets.map((widget, index) => {
          const area = this.determineWidgetArea(widget, templateData.templateType, index, filledAreas);
          const accessStatus = typeof widget.accessStatus === 'string'
            ? widget.accessStatus.trim().toLowerCase()
            : undefined;
          const widgetIdField = widget.CustomDashboardWidgetID ?? (widget as any).widgetId;
          const widgetName = widget.WidgetTitle.toLowerCase().replace(/\s+/g, '-');

          return {
            id: `${templateData.CustomDashboardID}-${widgetIdField}`,
            name: widgetName,
            position: area,
            settings: {
              module: widget.Module,
              symbols: widget.Symbols,
              additionalSettings: widget.AdditionalSettings,
              coordinates: {
                top: widget.TopPos,
                left: widget.LeftPos,
                width: widget.Width,
                height: widget.Height,
              },
              zIndex: widget.zIndex,
              customDashboardWidgetID: widgetIdField,
              customTabsID: widget.CustomTabsID,
              ...(accessStatus ? { accessStatus } : {})
            }
          };
        }),
        createdAt: templateData.UpdatedOn,
        updatedAt: templateData.UpdatedOn,
      };

      return updatedTemplate;
    } catch (error) {
      console.error(`❌ [TemplateApi] Error refreshing widgets for template ${templateId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new template with widgets
   */
  async createTemplateWithWidgets(request: CreateTemplateRequest): Promise<CreateTemplateResponse> {
    try {
      const headers = this.getAuthHeaders();

      // Map frontend layout to API layout before sending
      const apiLayout = this.mapFrontendToApiLayout(request.templateType);
      const mappedRequest = {
        ...request,
        templateType: apiLayout
      };

      const response = await fetch(`${this.baseUrl}/createNewTemplateWithWidgetsWeb`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json; charset=utf-8', // Explicitly set UTF-8 encoding
        },
        body: JSON.stringify(mappedRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Check if error is related to icon encoding and the icon is a flag emoji
        const isFlagEmoji = request.icon && /[\u{1F1E0}-\u{1F1FF}]/u.test(request.icon);
        if (isFlagEmoji && (response.status === 500 || errorText.includes('encode') || errorText.includes('character') || errorText.includes('UTF'))) {
          console.warn('Flag emoji might not be supported by backend, retrying with Globe icon');
          
          // Retry with a safe alternative icon
          const retryRequest = {
            ...mappedRequest,
            icon: 'Globe' // Use Globe as a safe fallback for flag emojis
          };
          
          const retryResponse = await fetch(`${this.baseUrl}/createNewTemplateWithWidgetsWeb`, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify(retryRequest),
          });
          
          if (!retryResponse.ok) {
            const retryErrorText = await retryResponse.text();
            return {
              success: false,
              message: `Failed to create template: ${retryResponse.statusText} - ${retryErrorText}`
            };
          }
          
          const retryData: ExternalCreateResponse = await retryResponse.json();
          
          if (retryData.Status !== "Success") {
            return {
              success: false,
              message: retryData.Message || 'Failed to create template'
            };
          }
          
          // Mark this template as recently created
          markTemplateAsRecentlyCreated(request.TemplateName);
          clearTemplatesCache();
          clearAllWidgetsCache();
          
          return {
            success: true,
            message: `${retryData.Message} (Note: Flag emoji was replaced with Globe icon due to backend limitations)`,
          };
        }
        
        return {
          success: false,
          message: `Failed to create template: ${response.statusText} - ${errorText}`
        };
      }

      const data: ExternalCreateResponse = await response.json();

      if (data.Status !== "Success") {
        return {
          success: false,
          message: data.Message || 'Failed to create template'
        };
      }

      // Mark this template as recently created to avoid unnecessary API calls
      markTemplateAsRecentlyCreated(request.TemplateName);

      // Clear cache after successful creation
      clearTemplatesCache();
      clearAllWidgetsCache(); // Clear all widget caches since templates changed

      return {
        success: true,
        message: data.Message,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create template'
      };
    }
  }

  /**
   * Update an existing template
   */
  async updateTemplate(templateId: string, updates: Partial<UserTemplate>): Promise<boolean> {
    // Note: External API doesn't have update endpoint, so we'll need to implement
    // this by creating a new template and potentially deleting the old one
    throw new Error('Update template not implemented - external API does not support updates');
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<{ success: boolean; message: string }> {
    try {
      const headers = this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/deleteTemplateWeb`, {
        method: 'DELETE', // Correctly using DELETE as per API specification
        headers,
        body: JSON.stringify({ templateId: parseInt(templateId) }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete template: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      // The delete API returns {"message": "..."} format, not {"Status": "Success", "Message": "..."}
      // If we get here, the deletion was successful (response.ok was true)

      // Clear cache after successful deletion
      clearTemplatesCache();
      clearWidgetsCache(parseInt(templateId)); // Clear widgets cache for deleted template
      clearAllWidgetsCache(); // Also clear all widget caches to be safe

      return {
        success: true,
        message: data.message || 'Template deleted successfully',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Rename a template
   */
  async renameTemplate(templateId: string, newTemplateName: string): Promise<{ success: boolean; message: string }> {
    try {
      const headers = this.getAuthHeaders();

      const response = await fetch(`${this.baseUrl}/renameTemplateWeb`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          templateId: parseInt(templateId),
          newTemplateName: newTemplateName
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Failed to rename template: ${response.statusText} - ${errorText}`
        };
      }

      const data = await response.json();

      // Check if the API returns a success status
      if (data.Status && data.Status !== "Success") {
        return {
          success: false,
          message: data.Message || 'Failed to rename template'
        };
      }

      return {
        success: true,
        message: data.message || data.Message || 'Template renamed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to rename template'
      };
    }
  }

  /**
   * Add a widget to an existing template
   */
  async addWidgetToTemplate(
    templateId: string,
    widgetTitle: string,
    additionalSettings: string = 'selectAll',
    position?: { top: number; left: number; height: number; width: number },
    cellPosition?: string, // Cell ID like 'g22_1' or 'gt22_1'
    customTabsID?: number, // CustomTabsID for tabbed widgets
    module?: string, // Module for widgets that need it (e.g., "Forex" for price-chart)
    symbols?: string // Symbols for widgets that need it (e.g., "EURUSD" for price-chart)
  ): Promise<{ success: boolean; message: string; noAccess?: boolean }> {
    try {
      const headers = this.getAuthHeaders();

      // Validate template ID can be parsed as an integer
      const parsedTemplateId = parseInt(templateId);
      if (isNaN(parsedTemplateId)) {
        return {
          success: false,
          message: `Invalid template ID: "${templateId}". Template may still be initializing. Please wait a moment and try again.`
        };
      }

      const requestBody: Record<string, unknown> = {
        TemplateId: parsedTemplateId,
        WidgetTitle: [widgetTitle], // Array format as per API spec
        Module: module || "", // Use provided module or empty string as per API spec
        Symbols: symbols || "", // Use provided symbols or empty string as per API spec
        AdditionalSettings: additionalSettings || 'selectAll|Important,Rumour,Highlighted,Normal|selectAll',
        TopPos: position?.top || 500, // Use provided position or default
        LeftPos: position?.left || 50,
        Height: position?.height || 300,
        Width: position?.width || 400,
        position: cellPosition || "absolute", // Use cell ID (g22_1, gt22_1, etc.) or fallback to "absolute"
        zIndex: 10
      };

      // Add CustomTabsID if provided (for tabbed widgets)
      if (customTabsID !== undefined && customTabsID !== null) {
        requestBody.CustomTabsID = customTabsID;
      }

      const response = await fetch(`${this.baseUrl}/addWidgetToTemplateWeb`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      // Read response text once
      const responseText = await response.text();

      if (!response.ok) {
        return {
          success: false,
          message: `Failed to add widget to template: ${response.statusText} - ${responseText}`
        };
      }

      // Parse JSON response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          message: 'Invalid response format from server'
        };
      }

      // Check if the API returns a success status
      if (data.Status && data.Status !== "Success") {
        return {
          success: false,
          message: data.Message || 'Failed to add widget to template'
        };
      }

      // Check for "No Access" case: Status="Success" but Message="No Access"
      // In this case, we still want to add the widget but mark it as restricted
      if (data.Status === "Success" && data.Message === "No Access") {
        // Clear cache after successful addition (even with No Access)
        clearTemplatesCache();
        clearWidgetsCache(parseInt(templateId)); // Clear widgets cache for this template
        return {
          success: true,
          message: data.Message || 'Widget added to template successfully',
          noAccess: true, // Special flag to indicate premium restriction
        };
      }

      // Clear cache after successful addition
      clearTemplatesCache();
      clearWidgetsCache(parseInt(templateId)); // Clear widgets cache for this template

      return {
        success: true,
        message: data.message || data.Message || 'Widget added to template successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add widget to template'
      };
    }
  }

  /**
   * Update widget fields (position, size, etc.)
   */
  async updateWidgetFields(
    widgetId: string,
    templateId: string,
    updates: {
      widgetTitle?: string;
      module?: string;
      symbols?: string;
      topPos?: number;
      leftPos?: number;
      height?: number;
      width?: number;
      position?: string;
      zIndex?: number;
      additionalSettings?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const headers = this.getAuthHeaders();

      const requestBody = {
        widgetId: parseInt(widgetId),
        templateId: parseInt(templateId),
        ...updates
      };

      const response = await fetch(`${this.baseUrl}/updateWidgetFieldsWeb`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      // Read response text once
      const responseText = await response.text();

      if (!response.ok) {
        return {
          success: false,
          message: `Failed to update widget fields: ${response.statusText} - ${responseText}`
        };
      }

      // Parse JSON response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          message: 'Invalid response format from server'
        };
      }

      // Check if the API returns a success status
      if (data.Status && data.Status !== "Success") {
        return {
          success: false,
          message: data.Message || 'Failed to update widget fields'
        };
      }

      // Clear cache after successful update
      clearTemplatesCache();
      clearWidgetsCache(parseInt(templateId)); // Clear widgets cache for this template

      return {
        success: true,
        message: data.message || data.Message || 'Widget fields updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update widget fields'
      };
    }
  }

  /**
   * Remove widget from template by widget ID
   */
  async removeWidgetByID(templateId: string, widgetId: string): Promise<{ success: boolean; message: string }> {
    try {
      const headers = this.getAuthHeaders();

      const requestBody = {
        templateID: parseInt(templateId),
        widgetID: parseInt(widgetId)
      };

      const response = await fetch(`${this.baseUrl}/removeWidgetByIDWeb`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify(requestBody),
      });

      // Read response text once
      const responseText = await response.text();

      if (!response.ok) {
        return {
          success: false,
          message: `Failed to remove widget: ${response.statusText} - ${responseText}`
        };
      }

      // Parse JSON response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          message: 'Invalid response format from server'
        };
      }

      if (data.Status && data.Status !== "Success") {
        return {
          success: false,
          message: data.Message || 'Failed to remove widget'
        };
      }

      // Clear widget cache after successful removal to ensure fresh data
      try {
        await fetch(`${this.baseUrl}/cleanUserWidgetCacheWeb`, {
          method: 'DELETE',
          headers: {
            ...headers,
            'x-api-key': 'segrW#$@dgnt547@'
          },
        });
      } catch (cacheError) {
        // Don't fail the entire operation if cache clearing fails
      }

      // Clear templates cache after successful removal
      clearTemplatesCache();
      clearWidgetsCache(parseInt(templateId)); // Clear widgets cache for this template

      return {
        success: true,
        message: data.message || data.Message || 'Widget removed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to remove widget'
      };
    }
  }

  /**
   * Update template fields (name, displayOrder, isFavorite, etc.)
   */
  async updateTemplateFields(templateId: string, fields: {
    templateName?: string;
    displayOrder?: number;
    isFavorite?: boolean;
    templateType?: string;
    layoutType?: string;
    filledAreas?: string;
    isFreeFloating?: boolean;
    icon?: string;
    isActiveTab?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const headers = this.getAuthHeaders();

      const requestBody = {
        templateId: parseInt(templateId),
        ...fields
      };

      const response = await fetch(`${this.baseUrl}/updateTemplateFieldsWeb`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      // Read response text once
      const responseText = await response.text();

      if (!response.ok) {
        return {
          success: false,
          message: `Failed to update template fields: ${response.statusText} - ${responseText}`
        };
      }

      // Parse JSON response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          message: 'Invalid response format from server'
        };
      }

      if (data.Status && data.Status !== "Success") {
        return {
          success: false,
          message: data.Message || 'Failed to update template fields'
        };
      }

      // Clear cache after successful update
      clearTemplatesCache();
      clearWidgetsCache(parseInt(templateId)); // Clear widgets cache for this template

      return {
        success: true,
        message: data.message || data.Message || 'Template fields updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update template fields'
      };
    }
  }

  /**
   * Create a details template for a symbol
   * This creates a new template with pre-configured widgets (Tab Menu Widget, tabs, and widgets inside tabs)
   */
  async createDetailsTemplate(symbol: string, displayOrder: number): Promise<{ 
    success: boolean; 
    message: string; 
    templateId?: number;
    widgets?: CreateDetailsTemplateResponse['Widgets'];
  }> {
    try {
      const headers = this.getAuthHeaders();

      const requestBody: CreateDetailsTemplateRequest = {
        symbol,
        displayOrder
      };

      const response = await fetch('/api/pmt/createDetailsTemplateWeb', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      // Read response text once
      const responseText = await response.text();

      if (!response.ok) {
        return {
          success: false,
          message: `Failed to create details template: ${response.statusText} - ${responseText}`
        };
      }

      // Parse JSON response
      let data: CreateDetailsTemplateResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          message: 'Invalid response format from server'
        };
      }

      if (data.Status !== "Success") {
        return {
          success: false,
          message: data.Message || 'Failed to create details template'
        };
      }

      // Mark this template as recently created to avoid unnecessary API calls
      markTemplateAsRecentlyCreated(symbol);

      // Clear cache after successful creation
      clearTemplatesCache();
      clearAllWidgetsCache(); // Clear all widget caches since templates changed

      // Extract templateId from the first widget's CustomDashboardID
      const templateId = data.Widgets?.[0]?.CustomDashboardID;

      // IMPORTANT: Extract TabDetails from the response and add them to the tab widgets cache
      // This ensures that when the TabbedWidget mounts, it can immediately find its tabs
      // without waiting for a separate getAllTabWidgetsWeb API call
      if (data.Widgets && data.Widgets.length > 0) {
        const tabDetailsFromResponse: Array<{
          CustomDashboardTabID: number;
          UserID: number;
          TabWidgetID: number;
          TabIcon: string;
          TabName: string;
          UpdatedOn: string;
          UpdatedFrom: string;
          TabGrid: number;
          TabWidgetGap: number;
          TabOrder: number;
          IsPredefined: number;
          TabColor: string;
        }> = [];

        for (const widget of data.Widgets) {
          if (widget.TabDetails) {
            tabDetailsFromResponse.push({
              CustomDashboardTabID: widget.TabDetails.CustomDashboardTabID,
              UserID: (widget.TabDetails as any).UserID || 0, // Extract UserID from response if available
              TabWidgetID: widget.TabDetails.TabWidgetID,
              TabIcon: widget.TabDetails.TabIcon,
              TabName: widget.TabDetails.TabName,
              UpdatedOn: new Date().toISOString(),
              UpdatedFrom: 'createDetailsTemplateWeb',
              TabGrid: widget.TabDetails.TabGrid,
              TabWidgetGap: widget.TabDetails.TabWidgetGap,
              TabOrder: widget.TabDetails.TabOrder,
              IsPredefined: widget.TabDetails.IsPredefined,
              TabColor: widget.TabDetails.TabColor,
            });
          }
        }

        // If we found any tabs in the response, add them to the tab widgets cache
        // BUT only if they have valid UserID (otherwise let getAllTabWidgets fetch them properly)
        if (tabDetailsFromResponse.length > 0) {
          const tabsWithUserID = tabDetailsFromResponse.filter(t => t.UserID && t.UserID > 0);
          
          if (tabsWithUserID.length > 0) {
            console.log('📦 [TemplateApi] Adding tabs from createDetailsTemplateWeb to cache:', tabsWithUserID.length);
            try {
              const { localGridPositionStorage } = await import('./localGridPositionStorage');
              
              // Get existing tab widgets from cache (if any)
              const existingCache = localGridPositionStorage.getAllTabWidgets();
              const existingTabs = existingCache?.Data || [];
              
              // Create a Map for O(1) lookup and update existing tabs or add new ones
              const tabsMap = new Map<number, typeof tabDetailsFromResponse[0]>();
              
              // First, add all existing tabs to the map
              existingTabs.forEach(tab => {
                tabsMap.set(tab.CustomDashboardTabID, tab);
              });
              
              // Then, update or add new tabs from response (this will overwrite duplicates)
              tabsWithUserID.forEach(tab => {
                tabsMap.set(tab.CustomDashboardTabID, tab);
              });
              
              // Convert Map back to array
              const mergedTabs = Array.from(tabsMap.values());
              
              // Save merged tabs to cache
              localGridPositionStorage.saveAllTabWidgets({
                Status: 'Success',
                Data: mergedTabs,
                Count: mergedTabs.length
              });
              
              console.log('✅ [TemplateApi] Tab widgets cache updated, total tabs:', mergedTabs.length);
            } catch (cacheError) {
              console.warn('⚠️ [TemplateApi] Failed to add tabs to cache:', cacheError);
            }
          } else {
            console.log('⏭️ [TemplateApi] Skipping cache - tabs from createDetailsTemplateWeb have no UserID, will be fetched by getAllTabWidgets');
          }
        }
      }

      return {
        success: true,
        message: data.Message || 'Details template created successfully',
        templateId,
        widgets: data.Widgets
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create details template'
      };
    }
  }
}

export const templateApi = new TemplateApiService();