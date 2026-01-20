/**
 * Tab Widget API Service
 * 
 * Handles API calls for tab widget operations
 */

import { postJSON } from '../utils/api';

export interface InsertTabWidgetRequest {
  TabWidgetID: number; // required: Tab widget ID (number)
  TabIcon?: string; // optional: Tab icon (string)
  TabName: string; // required: Tab name (string)
  TabGrid?: number | string; // optional: Tab grid configuration (number|string)
  TabWidgetGap?: number | string; // optional: Tab widget gap (number|string)
  TabOrder?: number; // optional: Tab order (number)
  IsPredefined?: number; // optional: Is predefined flag (number, default: 0)
  IsFavourite?: number; // optional: Is favourite flag (number, default: 0)
  TabColor?: string; // optional: Tab color (string)
}

export interface InsertTabWidgetResponse {
  Status?: string;
  Message?: string;
  CustomDashboardTabID?: number;
  Data?: {
    CustomDashboardTabID?: number;
  };
  success?: boolean;
}

export interface UpdateTabWidgetRequest {
  CustomDashboardTabID: number;
  TabWidgetID: number;
  TabIcon?: string;
  TabName: string;
  TabGrid?: number | string;
  TabWidgetGap?: number | string;
  TabOrder?: number;
  IsPredefined?: number;
  TabColor?: string;
  IsFavourite?: number;
}

export interface UpdateTabWidgetResponse {
  Status?: string;
  Message?: string;
  success?: boolean;
}

export interface GetTabWidgetRequest {
  CustomDashboardTabID: number; // required: Custom dashboard tab ID (number)
}

export interface GetTabWidgetResponse {
  Status?: string;
  Message?: string;
  TabWidget?: {
    CustomDashboardTabID?: number;
    TabWidgetID?: number;
    TabIcon?: string;
    TabName?: string;
    TabGrid?: string;
    TabWidgetGap?: string;
    TabOrder?: number;
    IsPredefined?: number;
    TabColor?: string;
  };
}

export interface TabWidgetData {
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
}

export interface GetAllTabWidgetsResponse {
  Status?: string;
  Message?: string;
  Data?: TabWidgetData[];
  Count?: number;
}

export interface DeleteTabWidgetRequest {
  CustomDashboardTabID: number; // required: Custom dashboard tab ID (number)
}

export interface DeleteTabWidgetResponse {
  Status?: string;
  Message?: string;
  success?: boolean;
}

export interface UpdateTabOrderRequest {
  UpdateTabOrder: Array<{
    tabid: number; // required: Tab ID (number)
    order: number; // required: New order position (number)
  }>;
}

export interface UpdateTabOrderResponse {
  Status?: string;
  Message?: string;
  success?: boolean;
}

export interface UpdateTabFavouriteItem {
  CustomDashboardTabID: number;
  TabWidgetID: number;
  IsFavourite: number;
}

export interface UpdateTabFavouriteRequest {
  data: UpdateTabFavouriteItem[];
}

export interface UpdateTabFavouriteResponse {
  Status?: string;
  Message?: string;
  success?: boolean;
}

export interface CopyDashboardTabRequest {
  TabID: number; // required: Original tab ID to copy (number)
  TabName: string; // required: New tab name (string)
  WgID: number; // required: Tab widget ID (number)
}

export interface CopyDashboardTabResponse {
  Status?: string;
  Message?: string;
  CustomDashboardTabID?: number;
  success?: boolean;
}

export interface RenameDashboardTabRequest {
  RenameDashboardTab: number; // required: Tab ID to rename (number)
  NewName: string; // required: New tab name (string)
}

export interface RenameDashboardTabResponse {
  Status?: string;
  Message?: string;
  success?: boolean;
}

export interface UpdateTabColorRequest {
  CustomDashboardTabID: number;
  TabColor: string;
}

export interface UpdateTabColorResponse {
  Status?: string;
  Message?: string;
  success?: boolean;
}

/**
 * Insert a new tab into a tabbed widget
 */
export async function insertTabWidget(
  request: InsertTabWidgetRequest
): Promise<InsertTabWidgetResponse> {
  
  try {
    const response = await postJSON<InsertTabWidgetResponse>(
      'insertTabWidgetWeb',
      request
    );
    
    // Extract CustomDashboardTabID from response (can be at root or in Data object)
    const customDashboardTabID = response.CustomDashboardTabID || response.Data?.CustomDashboardTabID;
    
    // If successful and we have CustomDashboardTabID, add to localStorage cache
    if ((response.Status === 'Success' || response.success) && customDashboardTabID) {
      try {
        const { localGridPositionStorage } = await import('./localGridPositionStorage');
        // Create tab widget data to add to cache
        const tabWidgetData = {
          CustomDashboardTabID: customDashboardTabID,
          UserID: 0, // Will be set by API
          TabWidgetID: request.TabWidgetID,
          TabIcon: request.TabIcon || 'Star',
          TabName: request.TabName,
          UpdatedOn: new Date().toISOString(),
          UpdatedFrom: 'Web',
          TabGrid: typeof request.TabGrid === 'number' ? request.TabGrid : parseInt(String(request.TabGrid)) || 1,
          TabWidgetGap: typeof request.TabWidgetGap === 'number' ? request.TabWidgetGap : parseInt(String(request.TabWidgetGap)) || 0,
          TabOrder: request.TabOrder || 0,
          IsPredefined: request.IsPredefined || 0,
          TabColor: request.TabColor || ''
        };
        localGridPositionStorage.addTabWidget(tabWidgetData);
      } catch (localError) {
        console.warn('⚠️ Failed to update local storage cache:', localError);
      }
    }
    
    // Normalize response - ensure CustomDashboardTabID is at root level for consistency
    const normalizedResponse = {
      ...response,
      CustomDashboardTabID: customDashboardTabID
    };
    return normalizedResponse;
  } catch (error) {
    return {
      success: false,
      Message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Update an existing tab widget
 */
export async function updateTabWidget(
  request: UpdateTabWidgetRequest
): Promise<UpdateTabWidgetResponse> {

  const payload: Record<string, unknown> = {
    CustomDashboardTabID: request.CustomDashboardTabID,
    TabWidgetID: request.TabWidgetID,
    TabName: request.TabName
  };

  if (request.TabIcon !== undefined) payload.TabIcon = request.TabIcon;
  if (request.TabGrid !== undefined) payload.TabGrid = request.TabGrid.toString();
  if (request.TabWidgetGap !== undefined) payload.TabWidgetGap = request.TabWidgetGap.toString();
  if (request.TabOrder !== undefined) payload.TabOrder = request.TabOrder;
  if (request.IsPredefined !== undefined) payload.IsPredefined = request.IsPredefined;
  if (request.TabColor !== undefined) payload.TabColor = request.TabColor;
  if (request.IsFavourite !== undefined) payload.IsFavourite = request.IsFavourite;

  try {
    const response = await postJSON<UpdateTabWidgetResponse>(
      'updateTabWidgetWeb',
      payload
    );

    // Update localStorage cache after successful update
    if (response.Status === 'Success' || response.success) {
      try {
        const { localGridPositionStorage } = await import('./localGridPositionStorage');
        // Get current cached data and update the specific tab
        const cachedData = localGridPositionStorage.getAllTabWidgets();
        if (cachedData && cachedData.Data) {
          const tabIndex = cachedData.Data.findIndex(t => t.CustomDashboardTabID === request.CustomDashboardTabID);
          if (tabIndex >= 0) {
            // Update the tab in cache
            cachedData.Data[tabIndex] = {
              ...cachedData.Data[tabIndex],
              TabWidgetID: request.TabWidgetID,
              TabName: request.TabName,
              TabIcon: request.TabIcon || cachedData.Data[tabIndex].TabIcon,
              TabGrid: typeof request.TabGrid === 'number' ? request.TabGrid : parseInt(String(request.TabGrid)) || cachedData.Data[tabIndex].TabGrid,
              TabWidgetGap: typeof request.TabWidgetGap === 'number' ? request.TabWidgetGap : parseInt(String(request.TabWidgetGap)) || cachedData.Data[tabIndex].TabWidgetGap,
              TabOrder: request.TabOrder !== undefined ? request.TabOrder : cachedData.Data[tabIndex].TabOrder,
              IsPredefined: request.IsPredefined !== undefined ? request.IsPredefined : cachedData.Data[tabIndex].IsPredefined,
              TabColor: request.TabColor || cachedData.Data[tabIndex].TabColor,
              UpdatedOn: new Date().toISOString()
            };
            localGridPositionStorage.saveAllTabWidgets(cachedData);
          }
        }
      } catch (localError) {
        console.warn('⚠️ Failed to update local storage cache:', localError);
      }
    }
    return response;
  } catch (error) {
    return {
      success: false,
      Message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get tab widget by ID
 */
export async function getTabWidgetById(
  request: GetTabWidgetRequest
): Promise<GetTabWidgetResponse> {
  
  try {
    const response = await postJSON<GetTabWidgetResponse>(
      'getTabWidgetByIdWeb',
      request
    );
    return response;
  } catch (error) {
    return {
      Status: 'Error',
      Message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get all tab widgets for the current user or for a specific TabWidgetID
 * Checks local storage first before calling API
 * @param forceRefresh - If true, skip cache and fetch from API
 * @param tabWidgetId - Optional TabWidgetID to fetch tabs for a specific tab widget
 */
export async function getAllTabWidgets(forceRefresh: boolean = false, tabWidgetId?: string | number): Promise<GetAllTabWidgetsResponse> {
  
  try {
    // Step 1: Check localStorage cache first (unless forceRefresh is true)
    if (!forceRefresh) {
      const { localGridPositionStorage } = await import('./localGridPositionStorage');
      const cachedData = localGridPositionStorage.getAllTabWidgets();
      if (cachedData && cachedData.Status === 'Success' && cachedData.Data && cachedData.Data.length > 0) {
        // If tabWidgetId is provided, filter cached data
        if (tabWidgetId !== undefined) {
          // Convert tabWidgetId to number for proper comparison
          const targetId = typeof tabWidgetId === 'number' ? tabWidgetId : parseInt(String(tabWidgetId), 10);
          const filteredData = cachedData.Data.filter(tab => tab.TabWidgetID === targetId);
          if (filteredData.length > 0) {
            console.log('✅ [TabWidgetApi] Using cached tab widgets from localStorage for TabWidgetID:', tabWidgetId, 'count:', filteredData.length);
            return { ...cachedData, Data: filteredData, Count: filteredData.length };
          }
        } else {
          console.log('✅ [TabWidgetApi] Using cached tab widgets from localStorage, count:', cachedData.Data.length);
          return cachedData;
        }
      }
    }
    
    // Step 2: Cache is empty or forceRefresh requested, fetch from API
    const requestBody = tabWidgetId !== undefined ? { TabWidgetID: tabWidgetId } : {};
    const response = await postJSON<GetAllTabWidgetsResponse>(
      'getTabWidgetsByTabWidgetIDWeb',
      requestBody
    );
    
    // Step 3: Merge API response with existing localStorage cache
    if (response.Status === 'Success' && response.Data && response.Data.length > 0) {
      const { localGridPositionStorage } = await import('./localGridPositionStorage');
      
      // Get existing cached data
      const existingCache = localGridPositionStorage.getAllTabWidgets();
      
      if (existingCache && existingCache.Data && existingCache.Data.length > 0) {
        // Use Map for O(1) lookup and proper deduplication
        const tabsMap = new Map<number, TabWidgetData>();
        
        // First, add all existing tabs to the map
        existingCache.Data.forEach(tab => {
          tabsMap.set(tab.CustomDashboardTabID, tab);
        });
        
        // Then, update or add tabs from API response (overwrites duplicates)
        response.Data.forEach(newTab => {
          tabsMap.set(newTab.CustomDashboardTabID, newTab);
        });
        
        // Convert Map back to array
        const mergedData = Array.from(tabsMap.values());
        
        localGridPositionStorage.saveAllTabWidgets({
          Status: 'Success',
          Data: mergedData,
          Count: mergedData.length
        });
      } else {
        // No existing cache, save as is
        localGridPositionStorage.saveAllTabWidgets(response);
      }
    }
    
    return response;
  } catch (error) {
    return {
      Status: 'Error',
      Message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Delete a tab widget by CustomDashboardTabID
 */
export async function deleteTabWidget(
  request: DeleteTabWidgetRequest
): Promise<DeleteTabWidgetResponse> {
  
  try {
    const response = await postJSON<DeleteTabWidgetResponse>(
      'deleteTabWidgetWeb',
      request
    );
    
    // Update localStorage cache if deletion was successful
    if (response.Status === 'Success' || response.success) {
      try {
        const { localGridPositionStorage } = await import('./localGridPositionStorage');
        localGridPositionStorage.deleteTabWidget(request.CustomDashboardTabID);
        localGridPositionStorage.deleteTabGridPositionsByTabId(request.CustomDashboardTabID);
      } catch (localError) {
        console.warn('⚠️ Failed to update local storage after delete:', localError);
      }
    }
    return response;
  } catch (error) {
    return {
      success: false,
      Status: 'Error',
      Message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Update tab order
 */
export async function updateTabOrder(
  request: UpdateTabOrderRequest
): Promise<UpdateTabOrderResponse> {
  
  try {
    const response = await postJSON<UpdateTabOrderResponse>(
      'updateTabOrderWeb',
      request
    );
    
    // Update localStorage cache with new order
    if (response.Status === 'Success' || response.success) {
      try {
        const { localGridPositionStorage } = await import('./localGridPositionStorage');
        const cachedData = localGridPositionStorage.getAllTabWidgets();
        if (cachedData && cachedData.Data) {
          request.UpdateTabOrder.forEach(({ tabid, order }) => {
            const tabIndex = cachedData.Data!.findIndex(t => t.CustomDashboardTabID === tabid);
            if (tabIndex >= 0) {
              cachedData.Data![tabIndex].TabOrder = order;
            }
          });
          localGridPositionStorage.saveAllTabWidgets(cachedData);
        }
      } catch (localError) {
        console.warn('⚠️ Failed to update local storage cache:', localError);
      }
    }
    return response;
  } catch (error) {
    return {
      success: false,
      Status: 'Error',
      Message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Update favourite status for tabbed widget tabs
 */
export async function updateTabFavourite(
  request: UpdateTabFavouriteRequest
): Promise<UpdateTabFavouriteResponse> {

  try {
    const response = await postJSON<UpdateTabFavouriteResponse>(
      'updateTabFavouriteWeb',
      request
    );
    return response;
  } catch (error) {
    return {
      success: false,
      Status: 'Error',
      Message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Copy a dashboard tab
 */
export async function copyDashboardTab(
  request: CopyDashboardTabRequest
): Promise<CopyDashboardTabResponse> {
  
  try {
    const response = await postJSON<CopyDashboardTabResponse>(
      'copyDashboardTabWeb',
      request
    );
    
    // Clear localStorage cache after copy to force fresh data on next load
    // This is needed because we don't have the full new tab data from the API response
    if (response.Status === 'Success' || response.success) {
      try {
        const { localGridPositionStorage } = await import('./localGridPositionStorage');
        localGridPositionStorage.clearTabWidgets();
      } catch (localError) {
        console.warn('⚠️ Failed to clear local storage cache after copy:', localError);
      }
    }
    return response;
  } catch (error) {
    return {
      success: false,
      Status: 'Error',
      Message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Rename a dashboard tab
 */
export async function renameDashboardTab(
  request: RenameDashboardTabRequest
): Promise<RenameDashboardTabResponse> {
  
  try {
    const response = await postJSON<RenameDashboardTabResponse>(
      'renameDashboardTabWeb',
      request
    );
    
    // Update localStorage cache with new name
    if (response.Status === 'Success' || response.success) {
      try {
        const { localGridPositionStorage } = await import('./localGridPositionStorage');
        const cachedData = localGridPositionStorage.getAllTabWidgets();
        if (cachedData && cachedData.Data) {
          const tabIndex = cachedData.Data.findIndex(t => t.CustomDashboardTabID === request.RenameDashboardTab);
          if (tabIndex >= 0) {
            cachedData.Data[tabIndex].TabName = request.NewName;
            cachedData.Data[tabIndex].UpdatedOn = new Date().toISOString();
            localGridPositionStorage.saveAllTabWidgets(cachedData);
          }
        }
      } catch (localError) {
        console.warn('⚠️ Failed to update local storage cache:', localError);
      }
    }
    return response;
  } catch (error) {
    return {
      success: false,
      Status: 'Error',
      Message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Update a dashboard tab's color
 */
export async function updateTabColor(
  request: UpdateTabColorRequest
): Promise<UpdateTabColorResponse> {

  try {
    const response = await postJSON<UpdateTabColorResponse>(
      'updateTabColorWeb',
      {
        CustomDashboardTabID: request.CustomDashboardTabID,
        TabColor: request.TabColor
      }
    );
    
    // Update localStorage cache with new color
    if (response.Status === 'Success' || response.success) {
      try {
        const { localGridPositionStorage } = await import('./localGridPositionStorage');
        const cachedData = localGridPositionStorage.getAllTabWidgets();
        if (cachedData && cachedData.Data) {
          const tabIndex = cachedData.Data.findIndex(t => t.CustomDashboardTabID === request.CustomDashboardTabID);
          if (tabIndex >= 0) {
            cachedData.Data[tabIndex].TabColor = request.TabColor;
            cachedData.Data[tabIndex].UpdatedOn = new Date().toISOString();
            localGridPositionStorage.saveAllTabWidgets(cachedData);
          }
        }
      } catch (localError) {
        console.warn('⚠️ Failed to update local storage cache:', localError);
      }
    }
    return response;
  } catch (error) {
    return {
      success: false,
      Status: 'Error',
      Message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Clear all tab widgets from localStorage cache
 * Useful when refreshing templates or forcing a fresh fetch
 */
export async function clearAllTabWidgetsCache(): Promise<void> {
  try {
    const { localGridPositionStorage } = await import('./localGridPositionStorage');
    localGridPositionStorage.clearTabWidgets();
  } catch (error) {
    // Error clearing tab widgets cache
  }
}
