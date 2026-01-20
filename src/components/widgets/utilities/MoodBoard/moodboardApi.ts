// MoodBoard API service for CRUD operations
// Uses credentials: 'include' to let Next.js API route handle authentication from cookies

export interface MoodboardTitle {
  MoodboardID: number;
  Title?: string;
  WidgetID?: number;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export interface MoodboardData {
  MoodboardID: number;
  CanvasData?: any; // JSON object containing canvas elements
  BrushSettings?: any; // JSON object containing brush settings
}

export interface MoodboardProps {
  MoodboardID: number;
  [key: string]: any;
}

export interface MoodboardListItem {
  ID: number;
  MoodboardID: number;
  MoodboardName: string;
  CreatedAt?: string;
}

const API_BASE = '/api/pmt';

// Get all moodboard titles
export async function getMoodboardTitles(): Promise<MoodboardTitle[]> {
  try {
    const response = await fetch(`${API_BASE}/GetMoodboardTitles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to fetch moodboard titles: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('getMoodboardTitles: Raw API response:', JSON.stringify(data, null, 2));
    
    // API returns: {"success":true,"moodboards":[{"ID":1102,"MoodboardName":""}]}
    if (data && data.success && Array.isArray(data.moodboards)) {
      console.log('getMoodboardTitles: Found moodboards array, length:', data.moodboards.length);
      return data.moodboards.map((mb: any) => ({
        MoodboardID: mb.ID,
        Title: mb.MoodboardName || '',
        WidgetID: mb.WidgetID,
        CreatedAt: mb.CreatedAt,
        UpdatedAt: mb.UpdatedAt,
      }));
    } else if (Array.isArray(data)) {
      console.log('getMoodboardTitles: Response is array, length:', data.length);
      return data;
    } else if (data && Array.isArray(data.moodboards)) {
      console.log('getMoodboardTitles: Response has moodboards array, length:', data.moodboards.length);
      return data.moodboards;
    }
    
    console.warn('getMoodboardTitles: No array found in response, returning empty array');
    return [];
  } catch (error) {
    console.error('Error fetching moodboard titles:', error);
    throw error;
  }
}

// Get moodboards (with optional MoodboardID filter)
export async function getMoodboards(moodboardID?: number): Promise<MoodboardListItem[]> {
  try {
    const url = `${API_BASE}/getMoodboards`;
    console.log('getMoodboards: Fetching from:', url);
    console.log('getMoodboards: MoodboardID filter:', moodboardID);
    
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(
          moodboardID ? { MoodboardID: moodboardID } : {}
        ),
      });
    } catch (fetchError: any) {
      console.error('getMoodboards: Fetch error details:', {
        message: fetchError?.message,
        name: fetchError?.name,
        stack: fetchError?.stack,
        url,
      });
      throw new Error(`Network error: ${fetchError?.message || 'Failed to fetch'}. URL: ${url}`);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to fetch moodboards: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('getMoodboards: Raw API response:', JSON.stringify(data, null, 2));
    
    // API returns: {"success":true,"moodboards":[{"ID":1102,"MoodboardName":"","CreatedAt":"..."}],"currentMoodboard":null}
    if (data && data.success && Array.isArray(data.moodboards)) {
      console.log('getMoodboards: Found moodboards array, length:', data.moodboards.length);
      // Return moodboards with ID property (not MoodboardID)
      return data.moodboards.map((mb: any) => ({
        ID: mb.ID,
        MoodboardID: mb.ID, // Also include MoodboardID for compatibility
        MoodboardName: mb.MoodboardName || '',
        CreatedAt: mb.CreatedAt,
      }));
    } else if (Array.isArray(data)) {
      console.log('getMoodboards: Response is array, length:', data.length);
      return data;
    } else if (data && Array.isArray(data.moodboards)) {
      console.log('getMoodboards: Response has moodboards array, length:', data.moodboards.length);
      return data.moodboards.map((mb: any) => ({
        ID: mb.ID,
        MoodboardID: mb.ID,
        MoodboardName: mb.MoodboardName || '',
        CreatedAt: mb.CreatedAt,
      }));
    }
    
    console.warn('getMoodboards: No array found in response, returning empty array');
    return [];
  } catch (error) {
    console.error('Error fetching moodboards:', error);
    throw error;
  }
}

// Load moodboard data
export async function loadMoodboard(moodboardID: number): Promise<MoodboardData | null> {
  try {
    if (!moodboardID || moodboardID <= 0) {
      throw new Error('Invalid MoodboardID');
    }

    const url = `${API_BASE}/LoadMoodboard`;
    console.log('loadMoodboard: Fetching from:', url);
    console.log('loadMoodboard: MoodboardID:', moodboardID);
    
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          MoodboardID: moodboardID,
        }),
      });
    } catch (fetchError: any) {
      console.error('loadMoodboard: Fetch error details:', {
        message: fetchError?.message,
        name: fetchError?.name,
        stack: fetchError?.stack,
        url,
      });
      throw new Error(`Network error: ${fetchError?.message || 'Failed to fetch'}. URL: ${url}`);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to load moodboard: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log('loadMoodboard: Raw API response keys:', responseData ? Object.keys(responseData) : 'null');
    console.log('loadMoodboard: Raw API response (first 1000 chars):', JSON.stringify(responseData, null, 2).substring(0, 1000));
    
    // API response structure: {"success": true, "data": {...}} or {"MoodboardID": 1102, "CanvasData": "...", ...}
    // Check if data is nested under a "data" key
    let data: any = responseData;
    if (responseData && responseData.data && typeof responseData.data === 'object') {
      console.log('loadMoodboard: Response has nested data key, extracting...');
      data = responseData.data;
      console.log('loadMoodboard: Extracted data keys:', Object.keys(data));
    } else if (responseData && responseData.success && responseData.data) {
      console.log('loadMoodboard: Response has success and data keys, using data...');
      data = responseData.data;
    }
    
    // Handle case where moodboard doesn't exist yet (new moodboard)
    if (data && (data.success === false || responseData?.success === false) && (data.error === 'No moodboard data found' || responseData?.error === 'No moodboard data found')) {
      console.log('loadMoodboard: No moodboard data found, returning empty moodboard');
      return {
        MoodboardID: moodboardID,
        CanvasData: {
          elements: [],
          background: '#080A0C',
          backgroundColor: '#080A0C',
        },
        BrushSettings: {
          width: 2,
          color: '#ffffff',
          backgroundColor: '#080A0C',
        },
      };
    }
    
    console.log('loadMoodboard: CanvasData type:', data?.CanvasData ? typeof data.CanvasData : 'missing');
    console.log('loadMoodboard: CanvasData value (first 200 chars):', data?.CanvasData ? String(data.CanvasData).substring(0, 200) : 'missing');
    
    // API returns: {"MoodboardID":1102,"CanvasData":"{...}","BrushSettings":"{...}",...}
    // CanvasData and BrushSettings are JSON strings that need parsing
    if (data && data.CanvasData) {
      if (typeof data.CanvasData === 'string') {
        console.log('loadMoodboard: CanvasData is string, length:', data.CanvasData.length);
        try {
          const parsed = JSON.parse(data.CanvasData);
          console.log('loadMoodboard: Parsed CanvasData successfully');
          console.log('loadMoodboard: Parsed CanvasData type:', typeof parsed);
          console.log('loadMoodboard: Parsed CanvasData keys:', parsed ? Object.keys(parsed) : 'null');
          if (parsed && Array.isArray(parsed.elements)) {
            console.log('loadMoodboard: Parsed elements array length:', parsed.elements.length);
          }
          data.CanvasData = parsed;
        } catch (e) {
          console.error('loadMoodboard: Error parsing CanvasData:', e);
          console.error('loadMoodboard: CanvasData string (first 500 chars):', data.CanvasData.substring(0, 500));
          // If parsing fails, try to return empty canvas data instead of failing
          data.CanvasData = {
            elements: [],
            background: '#080A0C',
            backgroundColor: '#080A0C',
          };
        }
      } else if (typeof data.CanvasData === 'object') {
        console.log('loadMoodboard: CanvasData is already an object');
        console.log('loadMoodboard: CanvasData keys:', Object.keys(data.CanvasData));
        if (Array.isArray(data.CanvasData.elements)) {
          console.log('loadMoodboard: CanvasData.elements array length:', data.CanvasData.elements.length);
        }
      }
    } else {
      console.warn('loadMoodboard: No CanvasData in response');
      // Return empty canvas data if missing
      data = data || {};
      data.CanvasData = {
        elements: [],
        background: '#080A0C',
        backgroundColor: '#080A0C',
      };
    }
    
    if (data && data.BrushSettings && typeof data.BrushSettings === 'string') {
      console.log('loadMoodboard: BrushSettings is string, parsing...');
      try {
        data.BrushSettings = JSON.parse(data.BrushSettings);
        console.log('loadMoodboard: Parsed BrushSettings successfully');
      } catch (e) {
        console.error('loadMoodboard: Error parsing BrushSettings:', e);
        data.BrushSettings = {};
      }
    } else if (data && data.BrushSettings && typeof data.BrushSettings === 'object') {
      console.log('loadMoodboard: BrushSettings is already an object');
    }
    
    console.log('loadMoodboard: Returning data with CanvasData:', {
      hasCanvasData: !!data.CanvasData,
      canvasDataType: typeof data.CanvasData,
      hasElements: !!(data.CanvasData && data.CanvasData.elements),
      elementsLength: data.CanvasData && Array.isArray(data.CanvasData.elements) ? data.CanvasData.elements.length : 0,
      moodboardID: data.MoodboardID || moodboardID,
    });
    
    // Ensure MoodboardID is set in the returned data
    if (!data.MoodboardID) {
      data.MoodboardID = moodboardID;
    }
    
    console.log('loadMoodboard: Final return structure:', {
      MoodboardID: data.MoodboardID,
      hasCanvasData: !!data.CanvasData,
      canvasDataIsObject: typeof data.CanvasData === 'object',
      elementsCount: data.CanvasData && Array.isArray(data.CanvasData.elements) ? data.CanvasData.elements.length : 'N/A',
    });
    
    return data;
  } catch (error) {
    console.error('Error loading moodboard:', error);
    throw error;
  }
}

// Save moodboard data
export async function saveMoodboard(
  moodboardID: number,
  canvasData: any,
  brushSettings: any = {},
  moodboardName?: string
): Promise<any> {
  try {
    if (!moodboardID || moodboardID <= 0) {
      throw new Error('Invalid MoodboardID');
    }

    // API expects CanvasData and BrushSettings as JSON strings
    const canvasDataString = typeof canvasData === 'string' 
      ? canvasData 
      : JSON.stringify(canvasData || {});
    const brushSettingsString = typeof brushSettings === 'string'
      ? brushSettings
      : JSON.stringify(brushSettings || {});
    
    console.log('saveMoodboard: CanvasData string:', canvasDataString);
    console.log('saveMoodboard: BrushSettings string:', brushSettingsString);
    console.log('saveMoodboard: MoodboardName:', moodboardName);
    
    const requestBody: any = {
      MoodboardID: moodboardID,
      CanvasData: canvasDataString,
      BrushSettings: brushSettingsString,
    };
    
    // Include MoodboardName if provided
    if (moodboardName) {
      requestBody.MoodboardName = moodboardName;
    }
    
    const response = await fetch(`${API_BASE}/SaveMoodboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    // Read response as text first to check if it's JSON
    const responseText = await response.text();
    console.log('saveMoodboard: Response status:', response.status);
    console.log('saveMoodboard: Response text:', responseText);

    if (!response.ok) {
      let errorMessage = `Failed to save moodboard: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (responseText) {
          errorMessage += ` - ${responseText}`;
        }
      }
      throw new Error(errorMessage);
    }

    // Check if response contains data about the saved moodboard
    try {
      if (!responseText) {
        console.log('saveMoodboard: Empty response, returning success');
        return { success: true, MoodboardID: moodboardID };
      }
      
      const responseData = JSON.parse(responseText);
      console.log('saveMoodboard: API response:', responseData);
      
      // Return the response data which might contain the actual MoodboardID
      // If the backend assigned a different ID, it should be in the response
      return responseData;
    } catch (e) {
      // If response is not JSON, just return success with the ID we used
      console.log('saveMoodboard: Response is not JSON, returning success');
      return { success: true, MoodboardID: moodboardID };
    }
  } catch (error) {
    console.error('Error saving moodboard:', error);
    throw error;
  }
}

// Clear moodboard
export async function clearMoodboard(moodboardID: number): Promise<boolean> {
  try {
    if (!moodboardID || moodboardID <= 0) {
      throw new Error('Invalid MoodboardID');
    }

    const clearedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const response = await fetch(`${API_BASE}/ClearMoodboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        MoodboardID: moodboardID,
        ClearedAt: clearedAt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to clear moodboard: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    console.error('Error clearing moodboard:', error);
    throw error;
  }
}

// Delete moodboard
export async function deleteMoodboard(moodboardID: number): Promise<boolean> {
  try {
    if (!moodboardID || moodboardID <= 0) {
      throw new Error('Invalid MoodboardID');
    }

    const response = await fetch(`${API_BASE}/DeleteMoodboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        DeleteMoodboard: moodboardID,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to delete moodboard: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    return true;
  } catch (error) {
    console.error('Error deleting moodboard:', error);
    throw error;
  }
}

// Get moodboard properties
export async function getMoodboardProps(moodboardID: number): Promise<MoodboardProps | null> {
  try {
    if (!moodboardID || moodboardID <= 0) {
      throw new Error('Invalid MoodboardID');
    }

    const response = await fetch(`${API_BASE}/GetMoodboardProps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        MoodboardID: moodboardID,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to get moodboard props: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting moodboard props:', error);
    throw error;
  }
}

// Create moodboard and add to dashboard
export interface CreateMoodboardRequest {
  TemplateId?: number; // optional - if not provided, API may use default or create without template
  MoodboardName?: string; // optional
  WidgetID?: string; // optional
  TopPos?: number; // optional, default: 0
  LeftPos?: number; // optional, default: 0
  Height?: number; // optional, default: 200
  Width?: number; // optional, default: 300
  position?: string; // optional
  zIndex?: number; // optional, default: 0
  CustomTabsID?: number; // optional, default: 0
}

export interface CreateMoodboardResponse {
  MoodboardID?: number;
  success?: boolean;
  [key: string]: any;
}

export async function createMoodboard(request: CreateMoodboardRequest): Promise<CreateMoodboardResponse> {
  try {
    const requestBody: any = {
      MoodboardName: request.MoodboardName || '',
      WidgetID: request.WidgetID || '',
      TopPos: request.TopPos ?? 0,
      LeftPos: request.LeftPos ?? 0,
      Height: request.Height ?? 200,
      Width: request.Width ?? 300,
      position: request.position || '',
      zIndex: request.zIndex ?? 0,
      CustomTabsID: request.CustomTabsID ?? 0,
    };

    // Include TemplateId - use provided value or default to 0 if API requires it
    requestBody.TemplateId = request.TemplateId ?? 0;

    console.log('createMoodboard: Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${API_BASE}/CreateMoodboardAndAddToDashboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to create moodboard: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const responseText = await response.text();
    console.log('createMoodboard: Response status:', response.status);
    console.log('createMoodboard: Response text:', responseText);

    try {
      if (!responseText) {
        console.log('createMoodboard: Empty response, returning success');
        return { success: true };
      }
      
      const responseData = JSON.parse(responseText);
      console.log('createMoodboard: API response:', responseData);
      return responseData;
    } catch (e) {
      console.log('createMoodboard: Response is not JSON, returning success');
      return { success: true };
    }
  } catch (error) {
    console.error('Error creating moodboard:', error);
    throw error;
  }
}

// Update moodboard
export interface UpdateMoodboardRequest {
  MoodboardID: number; // required
  MoodboardName?: string; // optional
  WidgetID?: string; // optional
  CanvasData?: any; // optional: Canvas data object (JSON)
  BrushSettings?: any; // optional: Brush settings object (JSON)
}

export interface UpdateMoodboardResponse {
  success?: boolean;
  MoodboardID?: number;
  [key: string]: any;
}

export async function updateMoodboard(request: UpdateMoodboardRequest): Promise<UpdateMoodboardResponse> {
  try {
    if (!request.MoodboardID || request.MoodboardID <= 0) {
      throw new Error('MoodboardID is required');
    }

    const requestBody: any = {
      MoodboardID: request.MoodboardID,
    };

    // Include optional fields
    if (request.MoodboardName !== undefined) {
      requestBody.MoodboardName = request.MoodboardName;
    }
    if (request.WidgetID !== undefined) {
      requestBody.WidgetID = request.WidgetID;
    }
    
    // Handle CanvasData - convert to JSON string if it's an object
    if (request.CanvasData !== undefined) {
      requestBody.CanvasData = typeof request.CanvasData === 'string' 
        ? request.CanvasData 
        : JSON.stringify(request.CanvasData || {});
    }
    
    // Handle BrushSettings - convert to JSON string if it's an object
    if (request.BrushSettings !== undefined) {
      requestBody.BrushSettings = typeof request.BrushSettings === 'string'
        ? request.BrushSettings
        : JSON.stringify(request.BrushSettings || {});
    }

    console.log('updateMoodboard: Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${API_BASE}/UpdateMoodboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to update moodboard: ${response.status} ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage += ` - ${errorText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const responseText = await response.text();
    console.log('updateMoodboard: Response status:', response.status);
    console.log('updateMoodboard: Response text:', responseText);

    try {
      if (!responseText) {
        console.log('updateMoodboard: Empty response, returning success');
        return { success: true, MoodboardID: request.MoodboardID };
      }
      
      const responseData = JSON.parse(responseText);
      console.log('updateMoodboard: API response:', responseData);
      return responseData;
    } catch (e) {
      console.log('updateMoodboard: Response is not JSON, returning success');
      return { success: true, MoodboardID: request.MoodboardID };
    }
  } catch (error) {
    console.error('Error updating moodboard:', error);
    throw error;
  }
}

