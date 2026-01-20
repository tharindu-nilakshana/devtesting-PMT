// Client-side API functions for Live Squawk widget

export interface SquawkChannel {
  name: string;
  label: string;
  lag: number;
  stream: string[];
}

export interface GetChannelsResponse {
  success: boolean;
  widgetID: number;
  channels: SquawkChannel[];
  dataChannels: string;
}

export interface GetWebSocketUrlResponse {
  success: boolean;
  websocketUrl: string;
  token: string;
}

// Get Live Squawk channels
export async function getLiveSquawkChannels(widgetID: number): Promise<GetChannelsResponse | null> {
  try {
    const response = await fetch('/api/pmt/get-live-squawk-channels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ widgetID }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ [Live Squawk] Channels API returned error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      console.warn('⚠️ [Live Squawk] Channels API returned unsuccessful response:', result);
      return null;
    }

    return result.data;
  } catch (error) {
    console.warn('⚠️ [Live Squawk] Error fetching channels:', error);
    return null;
  }
}

// Get Live Squawk WebSocket URL
export async function getLiveSquawkWebSocketUrl(): Promise<GetWebSocketUrlResponse | null> {
  try {
    console.log('📻 [Live Squawk API] Calling /api/pmt/get-live-squawk-websocket-url');
    const response = await fetch('/api/pmt/get-live-squawk-websocket-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    console.log('📻 [Live Squawk API] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Live Squawk API] WebSocket URL API returned error:', response.status, errorData);
      return null;
    }

    const result = await response.json();
    console.log('📻 [Live Squawk API] Response data:', {
      success: result.success,
      hasData: !!result.data,
      hasWebSocketUrl: !!result.data?.websocketUrl,
      dataKeys: result.data ? Object.keys(result.data) : []
    });

    if (!result.success) {
      console.error('❌ [Live Squawk API] API returned unsuccessful response:', result);
      return null;
    }

    if (!result.data) {
      console.error('❌ [Live Squawk API] API response missing data field:', result);
      return null;
    }

    if (!result.data.websocketUrl) {
      console.error('❌ [Live Squawk API] API response missing websocketUrl:', result.data);
      return null;
    }

    console.log('✅ [Live Squawk API] Successfully retrieved WebSocket URL');
    return result.data;
  } catch (error) {
    console.error('❌ [Live Squawk API] Error fetching WebSocket URL:', error);
    return null;
  }
}

