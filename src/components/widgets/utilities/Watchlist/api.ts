// API functions for Watchlist Widget

export interface WatchlistSymbol {
  WatchlistSymbolID: string;
  Symbol: string;
  SymbolUrl: string;
  AddedOn: string;
  Direction: string;
  OrderType: string;
  Entry: string;
  AddedAtPrice: number;
  CurrentPrice: number;
}

export interface Watchlist {
  WatchlistID: string;
  WatchlistName: string;
  Color: string;
  Symbols: WatchlistSymbol[];
  SymbolIDs: string;
}

export interface GetWatchlistsRequest {
  GetWatchlists?: string; // Watchlist ID to filter by, or "-1" for all watchlists
}

export interface GetWatchlistsResponse {
  Watchlists: Watchlist[];
}

export interface CreateWatchlistRequest {
  TemplateId: number;
  WatchlistName: string;
  WidgetID?: string; // Widget ID (wgid) - optional
  Color?: string;
  TopPos?: number;
  LeftPos?: number;
  Height?: number;
  Width?: number;
  position?: string;
  zIndex?: number;
  CustomTabsID?: number;
}

export interface CreateWatchlistResponse {
  success?: boolean;
  message?: string;
  watchlistId?: number; // New field in improved response
  widgetID?: string | number; // Widget ID returned from API (required for subsequent calls)
  data?: {
    WatchlistID?: number;
    WatchlistName?: string;
    Color?: string;
    WidgetID?: string | number; // Widget ID in data object
  };
  // Legacy fields for backward compatibility
  WatchlistID?: number;
  WidgetID?: string | number; // Legacy widgetID field
  Status?: string;
  Message?: string; // API returns "Message" with capital M (old format)
  // Error handling
  error?: string;
  templateNotFound?: boolean; // Indicates template doesn't exist (likely unsaved)
}

export interface SaveWatchlistSymbolsRequest {
  SaveWatchlistSymbols: number; // Watchlist ID (required)
  Symbols: string; // Comma-separated Symbol IDs as string (e.g., "2,3") (required) - NOTE: This field expects Symbol IDs, not symbol names
  WidgetID?: string; // Widget ID (wgid) - optional
  CustomDashboardID?: number; // Optional - might be widget instance ID
}

export interface SaveWatchlistSymbolsResponse {
  success?: boolean;
  message?: string;
}

export interface UpdateWatchlistRequest {
  WatchlistID: number;
  WatchlistName?: string;
  Color?: string;
  WidgetID?: string; // Widget ID (wgid) - optional
}

export interface UpdateWatchlistResponse {
  success?: boolean;
  message?: string;
}

export interface UpdateWatchlistSymbolRequest {
  UpdateWatchlistSymbol: number; // WatchlistSymbolID
  Field: "Direction" | "OrderType" | "Entry";
  Val: string | number;
  WidgetID?: string; // Widget ID (wgid) - optional
}

export interface UpdateWatchlistSymbolResponse {
  success?: boolean;
  message?: string;
}

export interface DeleteWatchlistSymbolRequest {
  WatchlistID: number; // WatchlistSymbolID (note: API uses this as WatchlistSymbolID)
  SymbolID: number; // Symbol ID
  WidgetID?: string; // Widget ID (wgid) - optional
}

export interface DeleteWatchlistSymbolResponse {
  success?: boolean;
  message?: string;
}

export interface DeleteWatchlistRequest {
  WatchlistID: number; // Watchlist ID to delete
  WidgetID?: string; // Widget ID (wgid) - optional
}

export interface DeleteWatchlistResponse {
  success?: boolean;
  message?: string;
}

// Helper function to get auth token
const getAuthToken = (): string => {
  if (typeof window === 'undefined') {
    throw new Error('Authentication token not available on server');
  }
  const token = localStorage.getItem('pmt_auth_token');
  if (!token) {
    throw new Error('Authentication token not found');
  }
  return token;
};

// API Base URL
const API_BASE_URL = 'https://frontendapi.primemarket-terminal.com';

/**
 * Get watchlists from the API
 * @param watchlistId Optional watchlist ID to filter by, or "-1" for all watchlists
 * @returns Promise with watchlists data
 */
export async function getWatchlists(watchlistId: string = "-1"): Promise<GetWatchlistsResponse> {
  try {
    const token = getAuthToken();
    
    console.log('[Watchlist API] Making request:', {
      url: `${API_BASE_URL}/GetWatchlists`,
      watchlistId,
      hasToken: !!token
    });
    
    const response = await fetch(`${API_BASE_URL}/GetWatchlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        GetWatchlists: watchlistId
      }),
    });

    console.log('[Watchlist API] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Watchlist API] Error response:', errorText);
      throw new Error(`Failed to get watchlists: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[Watchlist API] Response data:', data);
    return data;
  } catch (error) {
    console.error('[Watchlist API] Fetch error:', error);
    throw error;
  }
}

/**
 * Create a new watchlist and add it to dashboard
 */
export async function createWatchlistAndAddToDashboard(request: CreateWatchlistRequest): Promise<CreateWatchlistResponse> {
  try {
    const token = getAuthToken();
    
    console.log('[Watchlist API] Creating watchlist:', request);
    
    const response = await fetch(`${API_BASE_URL}/CreateWatchlistAndAddToDashboard`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    console.log('[Watchlist API] Create response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      // Handle 404 as template not found (template might not be saved yet)
      if (response.status === 404) {
        console.log('[Watchlist API] Template not found (likely unsaved template):', errorData);
        // Return a response that indicates the template doesn't exist
        return {
          success: false,
          error: errorData.error || 'Template not found or does not belong to the user',
          templateNotFound: true,
        } as CreateWatchlistResponse;
      }
      
      console.error('[Watchlist API] Create error response:', errorText);
      throw new Error(`Failed to create watchlist: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[Watchlist API] Create response data:', data);
    return data;
  } catch (error) {
    console.error('[Watchlist API] Create fetch error:', error);
    throw error;
  }
}

/**
 * Save symbols to a watchlist
 */
export async function saveWatchlistSymbols(request: SaveWatchlistSymbolsRequest): Promise<SaveWatchlistSymbolsResponse> {
  try {
    const token = getAuthToken();
    
    console.log('[Watchlist API] Saving watchlist symbols:', request);
    
    const response = await fetch(`${API_BASE_URL}/SaveWatchlistSymbols`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    console.log('[Watchlist API] Save symbols response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Watchlist API] Save symbols error response:', errorText);
      throw new Error(`Failed to save watchlist symbols: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[Watchlist API] Save symbols response data:', data);
    return data;
  } catch (error) {
    console.error('[Watchlist API] Save symbols fetch error:', error);
    throw error;
  }
}

/**
 * Update watchlist name and/or color
 */
export async function updateWatchlist(request: UpdateWatchlistRequest): Promise<UpdateWatchlistResponse> {
  try {
    const token = getAuthToken();
    
    console.log('[Watchlist API] Updating watchlist:', request);
    
    const response = await fetch(`${API_BASE_URL}/UpdateWatchlist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    console.log('[Watchlist API] Update watchlist response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Watchlist API] Update watchlist error response:', errorText);
      throw new Error(`Failed to update watchlist: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[Watchlist API] Update watchlist response data:', data);
    return data;
  } catch (error) {
    console.error('[Watchlist API] Update watchlist fetch error:', error);
    throw error;
  }
}

/**
 * Update a watchlist symbol field (Direction, OrderType, or Entry)
 */
export async function updateWatchlistSymbol(request: UpdateWatchlistSymbolRequest): Promise<UpdateWatchlistSymbolResponse> {
  try {
    const token = getAuthToken();
    
    console.log('[Watchlist API] Updating watchlist symbol:', request);
    
    const response = await fetch(`${API_BASE_URL}/UpdateWatchlistSymbol`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    console.log('[Watchlist API] Update symbol response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Watchlist API] Update symbol error response:', errorText);
      throw new Error(`Failed to update watchlist symbol: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[Watchlist API] Update symbol response data:', data);
    return data;
  } catch (error) {
    console.error('[Watchlist API] Update symbol fetch error:', error);
    throw error;
  }
}

/**
 * Delete a symbol from a watchlist
 */
export async function deleteWatchlistSymbol(request: DeleteWatchlistSymbolRequest): Promise<DeleteWatchlistSymbolResponse> {
  try {
    const token = getAuthToken();
    
    console.log('[Watchlist API] Deleting watchlist symbol:', request);
    
    const response = await fetch(`${API_BASE_URL}/DeleteWatchlistSymbol`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    console.log('[Watchlist API] Delete symbol response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Watchlist API] Delete symbol error response:', errorText);
      throw new Error(`Failed to delete watchlist symbol: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[Watchlist API] Delete symbol response data:', data);
    return data;
  } catch (error) {
    console.error('[Watchlist API] Delete symbol fetch error:', error);
    throw error;
  }
}

/**
 * Helper function to get SymbolID from symbol name by fetching from getSymbols API
 */
async function getSymbolIDFromName(symbolName: string): Promise<number | null> {
  try {
    // Try different modules to find the symbol
    const modules = ['Forex', 'Stocks', 'Commodities', 'Indices'];
    for (const module of modules) {
      try {
        const response = await fetch(`${API_BASE_URL}/getSymbols`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ Module: module }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data?.data && Array.isArray(data.data)) {
            const symbolData = data.data.find((item: any) => item.Symbol === symbolName);
            if (symbolData && symbolData.SymbolID) {
              return parseInt(symbolData.SymbolID.toString());
            }
          }
        }
      } catch (err) {
        // Continue to next module
        continue;
      }
    }
    return null;
  } catch (error) {
    console.warn(`[Watchlist API] Failed to get SymbolID for ${symbolName}:`, error);
    return null;
  }
}

/**
 * Delete an entire watchlist
 * Note: If the API doesn't support this, we'll delete all symbols from the watchlist
 */
export async function deleteWatchlist(request: DeleteWatchlistRequest): Promise<DeleteWatchlistResponse> {
  try {
    const token = getAuthToken();
    
    console.log('[Watchlist API] Deleting watchlist:', request);
    
    // First, try to delete the watchlist directly (if endpoint exists)
    try {
      const response = await fetch(`${API_BASE_URL}/DeleteWatchlist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Watchlist API] Delete watchlist response data:', data);
        return data;
      }
    } catch (directDeleteError) {
      console.log('[Watchlist API] Direct delete watchlist endpoint not available, will delete all symbols instead');
    }
    
    // Fallback: Delete all symbols from the watchlist to effectively delete it
    // First, get the watchlist to find all symbols
    const watchlistResponse = await getWatchlists(request.WatchlistID.toString());
    if (watchlistResponse && watchlistResponse.Watchlists && watchlistResponse.Watchlists.length > 0) {
      const watchlist = watchlistResponse.Watchlists.find(
        (w: any) => w.WatchlistID?.toString() === request.WatchlistID.toString()
      ) || watchlistResponse.Watchlists[0];
      
      if (watchlist && watchlist.Symbols && watchlist.Symbols.length > 0) {
        // Parse SymbolIDs if available (comma-separated string)
        const symbolIDsArray = watchlist.SymbolIDs 
          ? watchlist.SymbolIDs.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
          : [];
        
        // Delete all symbols from the watchlist
        const deletePromises = watchlist.Symbols.map(async (symbol: WatchlistSymbol, index: number) => {
          // Try to get SymbolID from parsed SymbolIDs array first (by index)
          let symbolID = symbolIDsArray[index] || null;
          
          // If not found in array, try to fetch from API
          if (!symbolID) {
            symbolID = await getSymbolIDFromName(symbol.Symbol);
          }
          
          // If still no SymbolID, try to use 0 (API might accept it)
          if (!symbolID) {
            console.warn(`[Watchlist API] Could not find SymbolID for ${symbol.Symbol}, using 0`);
            symbolID = 0;
          }
          
          return deleteWatchlistSymbol({
            WatchlistID: parseInt(symbol.WatchlistSymbolID),
            SymbolID: symbolID,
            WidgetID: request.WidgetID,
          }).catch((err) => {
            console.warn(`[Watchlist API] Failed to delete symbol ${symbol.Symbol}:`, err);
            return null; // Continue deleting other symbols even if one fails
          });
        });
        
        await Promise.all(deletePromises);
        console.log('[Watchlist API] Deleted all symbols from watchlist, effectively deleting it');
        return { success: true, message: 'Watchlist deleted by removing all symbols' };
      }
    }
    
    return { success: true, message: 'Watchlist deleted' };
  } catch (error) {
    console.error('[Watchlist API] Delete watchlist fetch error:', error);
    throw error;
  }
}

