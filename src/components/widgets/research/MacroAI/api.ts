// Client-side API functions for Macro AI widget

export interface ApiSource {
  id: string;
  headline: string;
  date: string;
  doc_type: string;
  tags?: string;
  asset_classes?: string;
  market_session?: string;
  [key: string]: unknown; // Allow other fields
}

export interface EventCalendarItem {
  InvestingNewsID: number;
  NewsID: number;
  NewsDate: string;
  NewsTime: string;
  Country: string;
  Currency: string;
  Sentiment: number; // 1=low, 2=medium, 3=high impact
  NewsHeader: string;
  Actual: string;
  Forecast: string;
  Previous: string;
  UpdatedOn: string;
  status: string;
}

export interface ApiQueryResponse {
  response: string | {
    content?: string;
    text?: string;
    answer?: string;
    summary?: string;
    message?: string;
    [key: string]: unknown; // Allow other response fields
  };
  sources: ApiSource[];
  question_type?: string;
  data?: EventCalendarItem[] | unknown[];
  // Additional fields that may be present for specific question types
  items?: unknown[];
  results?: unknown[];
}

export interface Source {
  title: string;
  date: string;
  category?: string;
}

export interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  sources?: Source[];
  feedback?: 'up' | 'down' | null;
  question_type?: string;
  data?: EventCalendarItem[] | unknown[];
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: ApiSource[];
  Sources?: ApiSource[]; // API returns "Sources" with capital S
  timestamp?: string;
  createdAt?: string;
  CreatedAtLocal?: string;
  [key: string]: unknown;
}

export interface ChatHistoryResponse {
  items: ChatHistoryItem[];
  hasMore: boolean;
}

// Transform API source to component Source format
function transformSource(apiSource: ApiSource): Source {
  // Use doc_type as category, or derive from other fields
  let category = apiSource.doc_type || 'Other';
  
  // Normalize category names
  if (apiSource.doc_type === 'session_recap') {
    category = 'Session Recaps';
  } else if (apiSource.doc_type) {
    // Capitalize first letter and replace underscores
    category = apiSource.doc_type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  return {
    title: apiSource.headline || 'Untitled',
    date: apiSource.date || '',
    category,
  };
}

// Transform API query response to Message format
export function transformQueryResponse(apiResponse: ApiQueryResponse, messageId: string): Message {
  // Handle various response formats - the API may return content in different fields
  let content = '';
  
  if (typeof apiResponse.response === 'string') {
    content = apiResponse.response;
  } else if (apiResponse.response) {
    // Try multiple possible content fields in order of priority
    content = apiResponse.response.content 
      || apiResponse.response.text 
      || apiResponse.response.answer 
      || apiResponse.response.summary 
      || apiResponse.response.message 
      || '';
    
    // If still no content but response is an object, try to stringify it
    if (!content && typeof apiResponse.response === 'object') {
      // Check if there's any string value in the response object
      const responseObj = apiResponse.response as Record<string, unknown>;
      for (const key of Object.keys(responseObj)) {
        if (typeof responseObj[key] === 'string' && responseObj[key]) {
          content = responseObj[key] as string;
          break;
        }
      }
    }
  }
  
  // For special question types, if no content but has sources, create a summary
  const questionType = apiResponse.question_type;
  if (!content && apiResponse.sources && apiResponse.sources.length > 0) {
    if (questionType === 'smart_bias_history' || questionType === 'research_files' || questionType === 'session_recap') {
      content = `Found ${apiResponse.sources.length} relevant ${questionType === 'session_recap' ? 'session recap(s)' : 'item(s)'} for your query.`;
    }
  }
  
  // Handle data that might be in different fields
  let data = apiResponse.data;
  if (!data && apiResponse.items) {
    data = apiResponse.items as EventCalendarItem[];
  } else if (!data && apiResponse.results) {
    data = apiResponse.results as EventCalendarItem[];
  }
  
  return {
    id: messageId,
    type: 'ai',
    content,
    timestamp: new Date(),
    sources: apiResponse.sources?.map(transformSource) || [],
    question_type: questionType,
    data,
  };
}

// Transform chat history item to Message format
export function transformHistoryItem(item: ChatHistoryItem, index: number): Message {
  // Handle both "sources" (lowercase) and "Sources" (capital S) from API
  const sources = item.sources || item.Sources || [];
  
  // Handle timestamp from various possible fields
  let timestamp = new Date();
  if (item.timestamp) {
    timestamp = new Date(item.timestamp);
  } else if (item.createdAt) {
    timestamp = new Date(item.createdAt);
  } else if (item.CreatedAtLocal) {
    timestamp = new Date(item.CreatedAtLocal);
  }
  
  return {
    id: `history-${index}-${Date.now()}`,
    type: item.role === 'assistant' ? 'ai' : 'user',
    content: item.content || '',
    timestamp,
    sources: sources.map(transformSource),
    // Preserve question_type and data if they were stored in history
    question_type: (item as any).question_type as string | undefined,
    data: (item as any).data as EventCalendarItem[] | undefined,
  };
}

// Query AI endpoint
export async function queryAI(question: string): Promise<ApiQueryResponse | null> {
  try {
    const response = await fetch('/api/pmt/query-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ [Macro AI] Query API returned error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      console.warn('⚠️ [Macro AI] Query API returned unsuccessful response:', result);
      return null;
    }

    return result.data;
  } catch (error) {
    console.warn('⚠️ [Macro AI] Error querying AI:', error);
    return null;
  }
}

// Get chat history
export async function getChatHistory(
  widgetId: number,
  limit: number = 100,
  order: 'asc' | 'desc' = 'asc'
): Promise<ChatHistoryResponse | null> {
  try {
    const response = await fetch('/api/pmt/get-chat-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ WidgetID: widgetId, limit, order }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ [Macro AI] History API returned error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      console.warn('⚠️ [Macro AI] History API returned unsuccessful response:', result);
      return null;
    }

    return result.data;
  } catch (error) {
    console.warn('⚠️ [Macro AI] Error fetching chat history:', error);
    return null;
  }
}

// Save chat message
export async function saveChatMessage(
  widgetId: number,
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    sources?: ApiSource[];
  }>
): Promise<boolean> {
  try {
    const requestBody = { WidgetID: widgetId, messages };
    
    console.log('💾 [Macro AI] Saving chat message:', {
      widgetId,
      messageCount: messages.length,
      messages: messages.map(msg => ({
        role: msg.role,
        contentLength: msg.content.length,
        sourcesCount: msg.sources?.length || 0,
        hasSources: !!msg.sources && msg.sources.length > 0
      }))
    });
    
    const response = await fetch('/api/pmt/save-chat-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ [Macro AI] Save API returned error:', response.status, errorData.error);
      return false;
    }

    const result = await response.json();
    return result.success === true && result.data?.status === 'ok';
  } catch (error) {
    console.warn('⚠️ [Macro AI] Error saving chat message:', error);
    return false;
  }
}

// Clear chat history
export async function clearChatHistory(widgetId: number): Promise<boolean> {
  try {
    const response = await fetch('/api/pmt/clear-chat-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ WidgetID: widgetId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ [Macro AI] Clear Chat History API returned error:', response.status, errorData.error);
      return false;
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.warn('⚠️ [Macro AI] Error clearing chat history:', error);
    return false;
  }
}

