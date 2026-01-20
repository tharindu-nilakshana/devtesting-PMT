// API functions for Scoring Table Widget

export interface ScoringPeriod {
  PeriodID?: string;
  id?: string; // Alternative field name from GetAllScoringPeriodsForWidget
  WidgetID?: number;
  ScoringPeriodTitle?: string;
  title?: string; // Alternative field name
  StartDate?: string; // YYYY-MM-DD
  EndDate?: string; // YYYY-MM-DD
  startDate?: string; // MM/DD/YYYY format from GetAllScoringPeriodsForWidget
  endDate?: string; // MM/DD/YYYY format from GetAllScoringPeriodsForWidget
  IsActive?: boolean;
  status?: string; // "active" from GetAllScoringPeriodsForWidget
  indicatorCount?: number; // Number of indicators in this period
}

export interface TradeIdea {
  RowID: string;
  Indicator: string; // e.g., "EURUSD" or indicator name
  ValidDate?: string; // YYYY-MM-DD
  CurrencyData?: Record<string, any>; // Currency scores data
  DisplayOrder?: number;
}

export interface GetAllScoringPeriodsRequest {
  WidgetID: number;
}

export interface GetAllScoringPeriodsResponse {
  success: boolean;
  periods: ScoringPeriod[];
}

export interface GetCurrentActivePeriodResponse {
  success: boolean;
  message?: string;
  period?: ScoringPeriod;
}

export interface CreateScoringPeriodRequest {
  WidgetID: number;
  ScoringPeriodTitle?: string;
  StartDate: string; // YYYY-MM-DD, cannot be in past
  EndDate: string; // YYYY-MM-DD, must be after StartDate
}

export interface CreateScoringPeriodResponse {
  success: boolean;
  message?: string;
  period?: ScoringPeriod;
}

export interface SaveTradeIdeaRequest {
  WidgetID: number;
  RowID: string;
  Indicator: string;
  ValidDate?: string; // YYYY-MM-DD
  CurrencyData?: Record<string, any>;
}

export interface SaveTradeIdeaResponse {
  success: boolean;
  message?: string;
}

export interface LoadTradeIdeasRequest {
  WidgetID: number;
}

export type LoadTradeIdeasResponse = TradeIdea[];

export interface DeleteTradeIdeaRequest {
  WidgetID: number;
  RowID: string;
}

export interface DeleteTradeIdeaResponse {
  success: boolean;
  message?: string;
}

export interface DeleteScoringPeriodRequest {
  PeriodID: string;
}

export interface DeleteScoringPeriodResponse {
  success: boolean;
  message?: string;
}

export interface UpdateTradeIdeaOrderRequest {
  TradeIdeaOrder: Array<{
    RowID: string;
    DisplayOrder: number;
  }>;
}

export interface UpdateTradeIdeaOrderResponse {
  success: boolean;
  message?: string;
}

export interface GetScoringPeriodTitlesResponse {
  success?: boolean;
  titles?: string[];
  periods?: ScoringPeriod[];
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

// Get current active period
export async function getCurrentActivePeriod(): Promise<GetCurrentActivePeriodResponse> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/GetCurrentActivePeriod`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get current active period: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Get all scoring periods for a widget
export async function getAllScoringPeriods(request: GetAllScoringPeriodsRequest): Promise<GetAllScoringPeriodsResponse> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/GetAllScoringPeriods`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get all scoring periods: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Get all scoring periods for widget (alternative endpoint)
export async function getAllScoringPeriodsForWidget(): Promise<GetAllScoringPeriodsResponse> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/GetAllScoringPeriodsForWidget`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get all scoring periods for widget: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Create new scoring period
export async function createNewScoringPeriod(request: CreateScoringPeriodRequest): Promise<CreateScoringPeriodResponse> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/CreateNewScoringPeriod`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create scoring period: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Delete scoring period
export async function deleteScoringPeriod(request: DeleteScoringPeriodRequest): Promise<DeleteScoringPeriodResponse> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/DeleteScoringPeriod`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete scoring period: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Get scoring period titles
export async function getScoringPeriodTitles(): Promise<GetScoringPeriodTitlesResponse> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/GetScoringPeriodTitles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get scoring period titles: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Load trade ideas
export async function loadTradeIdeas(request: LoadTradeIdeasRequest): Promise<LoadTradeIdeasResponse> {
  const token = getAuthToken();
  
  console.log('LoadTradeIdeas request:', JSON.stringify(request, null, 2));
  
  const response = await fetch(`${API_BASE_URL}/LoadTradeIdeas`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  console.log('LoadTradeIdeas response status:', response.status);
  console.log('LoadTradeIdeas response headers:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LoadTradeIdeas error:', response.status, errorText);
    throw new Error(`Failed to load trade ideas: ${response.status} ${errorText}`);
  }

  const responseText = await response.text();
  console.log('LoadTradeIdeas response:', responseText);
  console.log('LoadTradeIdeas response length:', responseText.length);
  
  // Handle both JSON array and other formats
  try {
    const json = JSON.parse(responseText);
    console.log('LoadTradeIdeas parsed JSON:', json);
    console.log('LoadTradeIdeas is array:', Array.isArray(json));
    return Array.isArray(json) ? json : [];
  } catch (err) {
    // If response is not valid JSON, return empty array
    console.warn('LoadTradeIdeas returned non-JSON response:', responseText);
    console.warn('LoadTradeIdeas parse error:', err);
    return [];
  }
}

// Save trade idea
export async function saveTradeIdea(request: SaveTradeIdeaRequest): Promise<SaveTradeIdeaResponse> {
  const token = getAuthToken();
  
  // Prepare request body - keep CurrencyData as object (not stringified)
  const requestBody: any = {
    WidgetID: request.WidgetID,
    RowID: request.RowID,
    Indicator: request.Indicator,
  };
  
  if (request.ValidDate) {
    requestBody.ValidDate = request.ValidDate;
  }
  
  // CurrencyData as object (API expects object, not string)
  requestBody.CurrencyData = request.CurrencyData || {};
  
  console.log('SaveTradeIdea request body:', JSON.stringify(requestBody, null, 2));
  
  const response = await fetch(`${API_BASE_URL}/SaveTradeIdea`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('SaveTradeIdea error:', response.status, errorText);
    throw new Error(`Failed to save trade idea: ${response.status} ${errorText}`);
  }

  const responseText = await response.text();
  console.log('SaveTradeIdea response:', responseText);
  console.log('SaveTradeIdea response status:', response.status);
  
  // Handle both JSON and plain number responses
  try {
    const json = JSON.parse(responseText);
    return json;
  } catch {
    // If response is just a number (like "0"), treat it as success
    if (responseText.trim() === '0' || responseText.trim() === '') {
      return { success: true };
    }
    throw new Error(`Unexpected response format: ${responseText}`);
  }
}

// Delete trade idea
export async function deleteTradeIdea(request: DeleteTradeIdeaRequest): Promise<DeleteTradeIdeaResponse> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/DeleteTradeIdea`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete trade idea: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Update trade idea order
export async function updateTradeIdeaOrder(request: UpdateTradeIdeaOrderRequest): Promise<UpdateTradeIdeaOrderResponse> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/UpdateTradeIdeaOrder`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update trade idea order: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Check expired periods
export async function checkExpiredPeriods(widgetID: number): Promise<{ success: boolean; message?: string }> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/CheckExpiredPeriods`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ WidgetID: widgetID }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to check expired periods: ${response.status} ${errorText}`);
  }

  return await response.json();
}

