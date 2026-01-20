/**
 * Grid Position API Service
 * 
 * Handles API calls for saving grid positions
 * Always fetches from API - no local storage caching
 */

import { API_CONFIG } from './api';
import { getAuthToken } from '../utils/api';

export interface GridPositionRequest {
  TemplateID: number;
  Top: string;
  Left: string;
  Height: string;
  Width: string;
}

export interface GridPositionResponse {
  Status?: string;
  Message?: string;
  success?: boolean;
}

/**
 * Save grid positions to API
 * Uses Next.js API route /api/utilities/main-grid-properties
 * 
 * Saves to API and updates localStorage cache for consistency.
 */
export async function insertMainGridPosition(
  templateId: number,
  top: string,
  left: string,
  height: string,
  width: string
): Promise<GridPositionResponse> {
  try {
    const url = '/api/utilities/main-grid-properties';
    
    const requestBody = {
      templateId,
      top,
      left,
      height,
      width
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        Message: errorData.error || `Failed to save grid positions: ${response.statusText}`
      };
    }

    const data = await response.json();
    
    // Update localStorage cache after successful save
    if (data.data?.Status === 'Success' || data.success) {
      try {
        const { localGridPositionStorage } = await import('./localGridPositionStorage');
        localGridPositionStorage.saveMainGridPosition({
          TemplateID: templateId,
          Top: top,
          Left: left,
          Height: height,
          Width: width
        });
      } catch (localError) {
        console.warn('⚠️ Failed to update local storage cache:', localError);
      }
    }
    
    return {
      success: true,
      Status: data.data?.Status || 'Success',
      Message: data.data?.Message || 'Grid positions saved successfully'
    };
  } catch (error) {
    return {
      success: false,
      Message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export interface GridPosition {
  ID: number;
  TemplateID: number;
  Top: string;
  Left: string;
  Height: string;
  Width: string;
}

export interface GetGridPositionResponse {
  Status: string;
  GridPosition?: GridPosition;
}

export interface TabGridPositionCell {
  ID?: number; // Optional, API may auto-generate
  TabID: number;
  CellID: string;
  Top: string;
  Left: string;
  Width: string;
  Height: string;
}

export interface TabGridPositionResponse {
  Status?: string;
  Message?: string;
  success?: boolean;
}

/**
 * Get grid positions from API
 * Uses Next.js API route /api/utilities/main-grid-properties
 * 
 * Checks localStorage cache first, only calls API if cache is empty.
 * @param forceRefresh - If true, bypasses cache and always fetches from API
 */
export async function getMainGridPositionByTemplate(
  templateId: number,
  forceRefresh: boolean = false
): Promise<GetGridPositionResponse> {
  try {
    // Step 1: Check localStorage cache first (unless forceRefresh is true)
    if (!forceRefresh) {
      const { localGridPositionStorage } = await import('./localGridPositionStorage');
      const cachedData = localGridPositionStorage.getMainGridPositionByTemplate(templateId);
      if (cachedData && cachedData.Status === 'Success' && cachedData.GridPosition) {
        console.log('✅ [GridPositionApi] Using cached grid position from localStorage for template:', templateId);
        return cachedData;
      }
    }
    
    // Step 2: Cache is empty or forceRefresh requested, fetch from API
    const url = `/api/utilities/main-grid-properties?templateId=${templateId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        Status: 'Error',
        GridPosition: undefined
      };
    }

    const data = await response.json();
    
    // Extract the grid position from the nested response
    const gridPositionData = data.data?.GridPosition || data.data;
    
    // Step 3: Store API response in localStorage for future use
    if (gridPositionData && (data.data?.Status === 'Success' || data.success)) {
      const { localGridPositionStorage } = await import('./localGridPositionStorage');
      localGridPositionStorage.saveMainGridPosition({
        TemplateID: templateId,
        Top: gridPositionData.Top,
        Left: gridPositionData.Left,
        Height: gridPositionData.Height,
        Width: gridPositionData.Width
      });
    }
    
    return {
      Status: data.data?.Status || data.success ? 'Success' : 'Error',
      GridPosition: gridPositionData
    };
  } catch (error) {
    return {
      Status: 'Error',
      GridPosition: undefined
    };
  }
}

/**
 * Save tabbed widget grid positions to API
 * 
 * @param positions Array of cell positions for the tabbed widget
 * Note: API expects one cell per request (single object), so we send multiple requests
 * Always saves to API - no local storage caching
 */
export async function insertTabGridPosition(
  positions: TabGridPositionCell[]
): Promise<TabGridPositionResponse> {
  try {
    // Validate all positions have required fields
    const invalidPositions = positions.filter(pos => !pos.TabID || !pos.CellID);
    if (invalidPositions.length > 0) {
      return {
        success: false,
        Message: `Invalid positions: ${invalidPositions.length} position(s) missing required fields (TabID, CellID)`
      };
    }

    const token = getAuthToken();
    
    if (!token) {
      return { 
        success: false, 
        Message: 'No authentication token available'
      };
    }

    const url = `${API_CONFIG.UPSTREAM_API}insertTabGridPositionWeb`;
    
    // API expects one object per request (as confirmed by Postman)
    // Send one request per cell
    const results = await Promise.all(
      positions.map(async (pos, index) => {
        // Map to clean object with only required fields
        const requestBody = {
          TabID: pos.TabID,
          CellID: pos.CellID,
          Top: pos.Top,
          Left: pos.Left,
          Width: pos.Width,
          Height: pos.Height,
          ...(pos.ID !== undefined && { ID: pos.ID })
        };
        
        const requestBodyString = JSON.stringify(requestBody);
        
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: requestBodyString
          });

          if (!response.ok) {
            let errorText = 'Unknown error';
            let errorJson = null;
            
            try {
              const text = await response.text();
              errorText = text;
              try {
                errorJson = JSON.parse(text);
              } catch {
                // If not JSON, use the text as is
              }
            } catch (e) {
              errorText = `Failed to read error response: ${e instanceof Error ? e.message : 'Unknown'}`;
            }
            
            return {
              success: false,
              index,
              CellID: pos.CellID,
              error: errorJson?.Message || errorJson?.message || errorText || response.statusText
            };
          }

          const data = await response.json();
          
          return {
            success: true,
            index,
            CellID: pos.CellID,
            response: data
            };
          } catch (error) {
            return {
            success: false,
            index,
            CellID: pos.CellID,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          };
        }
      })
    );
    
    // Check if all requests succeeded
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
      const errorMessages = failedResults.map(r => `CellID ${r.CellID}: ${r.error}`).join('; ');
      return {
        success: false,
        Message: `Failed to save ${failedResults.length} of ${positions.length} positions to API: ${errorMessages}`
      };
    }
    
    // Step 4: Update localStorage cache after successful save
    try {
      const { localGridPositionStorage } = await import('./localGridPositionStorage');
      localGridPositionStorage.saveTabGridPositions(positions);
    } catch (localError) {
      console.warn('⚠️ Failed to update local storage cache for tab grid positions:', localError);
    }
    
    return {
      success: true,
      Status: 'Success',
      Message: `Successfully saved ${positions.length} tab grid position(s)`
    };
  } catch (error) {
    return {
      success: false,
      Message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export interface GetTabGridPositionsResponse {
  Status?: string;
  Message?: string;
  Data?: TabGridPositionCell[];
  Count?: number;
  success?: boolean;
}

export interface GetTabGridPositionByIdResponse {
  Status: string;
  GridPosition?: TabGridPositionCell;
}

/**
 * Get tab grid position by ID from API
 * Always fetches from API - no local storage caching
 * 
 * @param id The ID to fetch grid position for
 * @returns Response containing grid position
 */
export async function getTabGridPositionById(
  id: number
): Promise<GetTabGridPositionByIdResponse> {
  try {
    const token = getAuthToken();
    if (!token) {
      return {
        Status: 'Error',
        GridPosition: undefined
      };
    }

    const url = `${API_CONFIG.UPSTREAM_API}getTabGridPositionByIdWeb`;
    
    const requestBody = {
      ID: id
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        Status: 'Error',
        GridPosition: undefined
      };
    }

    const data = await response.json();
    
    return {
      Status: data.Status || 'Success',
      GridPosition: data.GridPosition
    };
  } catch (error) {
    return {
      Status: 'Error',
      GridPosition: undefined
    };
  }
}

/**
 * Get tab grid positions from API by TabID
 * Checks localStorage cache first, only calls API if cache is empty.
 * 
 * @param tabId The TabID to fetch grid positions for
 * @param forceRefresh If true, bypasses cache and always fetches from API
 * @returns Response containing array of grid position cells
 */
export async function getTabGridPositionsByTabId(
  tabId: number,
  forceRefresh: boolean = false
): Promise<GetTabGridPositionsResponse> {
  try {
    // Step 1: Check localStorage cache first (unless forceRefresh is true)
    if (!forceRefresh) {
      const { localGridPositionStorage } = await import('./localGridPositionStorage');
      const cachedPositions = localGridPositionStorage.getTabGridPositionsByTabId(tabId);
      if (cachedPositions && cachedPositions.length > 0) {
        console.log('✅ [GridPositionApi] Using cached tab grid positions from localStorage for tab:', tabId);
        return {
          Status: 'Success',
          Message: 'Retrieved from cache',
          Data: cachedPositions,
          Count: cachedPositions.length,
          success: true
        };
      }
    }
    
    // Step 2: Cache is empty or forceRefresh requested, fetch from API
    const url = `${API_CONFIG.PMT_API_ROOT}getTabGridPositionsByTabIdWeb`;
    
    const requestBody = {
      TabID: tabId
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        Status: 'Error',
        Message: `Failed to fetch tab grid positions: ${response.statusText}`,
        success: false
      };
    }

    const data = await response.json();
    
    // Handle both GridPositions (from API) and Data (from our route handler)
    const gridPositions = data.GridPositions || data.Data || [];
    
    // Step 3: Store API response in localStorage for future use
    if (gridPositions && gridPositions.length > 0 && (data.Status === 'Success' || data.success)) {
      const { localGridPositionStorage } = await import('./localGridPositionStorage');
      localGridPositionStorage.saveTabGridPositions(gridPositions);
    }
    
    return {
      Status: data.Status || 'Success',
      Message: data.Message,
      Data: gridPositions,
      Count: gridPositions.length || data.Count || 0,
      success: true
    };
  } catch (error) {
    return {
      Status: 'Error',
      Message: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false
    };
  }
}
