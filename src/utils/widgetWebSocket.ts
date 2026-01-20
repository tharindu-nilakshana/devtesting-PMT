import { API_CONFIG } from '../lib/api';

type WidgetUpdateCallback = (widgetName: string) => void;
type ConnectionStatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

interface WidgetWebSocketManager {
  connect: () => Promise<void>;
  disconnect: () => void;
  onWidgetUpdate: (callback: WidgetUpdateCallback) => void;
  onConnectionStatus: (callback: ConnectionStatusCallback) => void;
  removeWidgetUpdateCallback: (callback: WidgetUpdateCallback) => void;
  removeConnectionStatusCallback: (callback: ConnectionStatusCallback) => void;
  getConnectionStatus: () => string;
  isConnected: () => boolean;
}

class WidgetDataWebSocket implements WidgetWebSocketManager {
  private ws: WebSocket | null = null;
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  // Support multiple listeners per event type (similar to tradingViewWebSocket.ts)
  private widgetUpdateCallbacks: Set<WidgetUpdateCallback> = new Set();
  private connectionStatusCallbacks: Set<ConnectionStatusCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 2; // Reduce retries to prevent connection loops
  private reconnectDelay = 10000; // Increase delay to 10 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private messageCount = 0; // Track total messages received
  private receivedMessages: string[] = []; // Store all received messages

  async connect(): Promise<void> {
    // CRITICAL: Only allow WebSocket connections on client-side to avoid SSR issues
    if (typeof window === 'undefined') {
      console.log('🚫 [WIDGET-WS] WebSocket connection blocked during SSR - client-side only');
      throw new Error('WebSocket connections are only allowed on client-side');
    }

    // If already connected, don't reconnect
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('✅ [WIDGET] WebSocket already connected, skipping reconnect');
      return;
    }

    // Prevent multiple simultaneous connections
    if (this.isConnecting) {
      console.log('⏸️ [WIDGET] Connection already in progress, skipping');
      return;
    }

    // Only close existing connection if it's in a bad state (not OPEN)
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED && this.ws.readyState !== WebSocket.OPEN) {
      console.log('🔄 [WIDGET] Closing existing connection in bad state before reconnecting');
      this.disconnect();
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      this.isConnecting = true;
      
      // Use guide token directly as specified in WebSocket Guide
      const rawToken = 'gbu@jbdgb@jbjgth84Be3b@h';
      const token = this.validateAndPrepareToken(rawToken);

      this.setConnectionStatus('connecting');

      // Use centralized WebSocket configuration
      const wsUrl = this.buildSecureWebSocketUrl(API_CONFIG.WS_RTS, token);
      
      console.log('🔗 [WIDGET] Attempting to connect to:', this.sanitizeUrlForLogging(wsUrl));
      
      this.ws = new WebSocket(wsUrl);
      
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.isConnecting && this.ws?.readyState === WebSocket.CONNECTING) {
          this.ws.close();
          this.setConnectionStatus('error');
        }
      }, 10000);

      this.ws.onopen = () => {
        console.log('✅ [WIDGET] WebSocket connected successfully');
        this.isConnecting = false;
        
        // Clear connection timeout
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        this.setConnectionStatus('connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 10000; // Reset to configured delay
      };

      this.ws.onmessage = (event) => {
        // Increment message counter and store the message
        this.messageCount++;
        const timestamp = new Date().toISOString();
        
        // Store the raw message in our list
        this.receivedMessages.push(`${timestamp}: ${event.data}`);
        
          console.log('📨 [WIDGET] Raw message received:', event.data);
          
          try {
            // Try to parse as JSON first
            let parsedData: any = null;
            let widgetName: string;
            let messageType: 'json' | 'text' = 'text';
            
            try {
              parsedData = JSON.parse(event.data);
              messageType = 'json';
              console.log('📨 [WIDGET] Parsed JSON data:', parsedData);
              
              // Handle different message formats
              if (typeof parsedData === 'string') {
                widgetName = parsedData;
              } else if (parsedData.widget || parsedData.widgetName) {
                widgetName = parsedData.widget || parsedData.widgetName;
              } else if (parsedData.type && parsedData.type.includes('currency')) {
                widgetName = 'currency-strength';
              } else {
                widgetName = JSON.stringify(parsedData);
              }
            } catch {
              // If not JSON, treat as plain text
              messageType = 'text';
              widgetName = event.data.toString().trim();
              console.log('📨 [WIDGET] Plain text message:', widgetName);
            }
            
            console.log('🏷️ [WIDGET] Message type:', messageType, 'Widget name:', widgetName, 'Data:', parsedData);
          
          // Call all widget update callbacks with both widget name and parsed data
          this.widgetUpdateCallbacks.forEach(cb => {
            try {
              cb(widgetName);
            } catch (error) {
              console.error('❌ [WIDGET] Error in widget update callback:', error);
            }
          });
          
          // Also dispatch a custom event with the full data for widgets that need it
          const customEvent = new CustomEvent('pmt-widget-data', {
            detail: {
              widgetName,
              data: parsedData,
              rawData: event.data,
              timestamp
            }
          });
          window.dispatchEvent(customEvent);
          
        } catch (error) {
          console.error('❌ [WIDGET] Error processing message:', error);
          console.error('❌ [WIDGET] Failed on data:', event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 [WIDGET] WebSocket closed with code ${event.code}: ${event.reason}`);
        
        // Clear connection timeout if still active
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        this.setConnectionStatus('disconnected');
        this.isConnecting = false;
        this.ws = null;
        
        // Handle different close codes
        if (event.code === 1005) {
          console.log('⚠️ [WIDGET] Code 1005: Server closed without status - may be server-side issue');
        }
        
        // Attempt to reconnect if not manually disconnected and haven't exceeded max attempts
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log(`🔄 [WIDGET] Attempting to reconnect (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
          this.attemptReconnect();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log('❌ [WIDGET] Max reconnect attempts reached, stopping reconnection attempts');
        }
      };

      this.ws.onerror = (error) => {
        this.setConnectionStatus('error');
      };

    } catch (error) {
      console.error('❌ [WIDGET] Failed to connect:', error);
      this.isConnecting = false;
      this.setConnectionStatus('error');
      throw error;
    }
  }

  disconnect(): void {
    // Clear all timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Reset connection flags
    this.isConnecting = false;
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.setConnectionStatus('disconnected');
  }

  onWidgetUpdate(callback: WidgetUpdateCallback): void {
    this.widgetUpdateCallbacks.add(callback);
    console.log('📋 [WIDGET] Widget update callback registered. Total callbacks:', this.widgetUpdateCallbacks.size);
  }

  onConnectionStatus(callback: ConnectionStatusCallback): void {
    this.connectionStatusCallbacks.add(callback);
    console.log('📋 [WIDGET] Connection status callback registered. Total callbacks:', this.connectionStatusCallbacks.size);
    // Immediately notify the new callback of the current status
    try {
      callback(this.connectionStatus);
    } catch (error) {
      console.error('❌ [WIDGET] Error notifying new callback of current status:', error);
    }
  }

  removeWidgetUpdateCallback(callback: WidgetUpdateCallback): void {
    this.widgetUpdateCallbacks.delete(callback);
    console.log('📋 [WIDGET] Widget update callback removed. Remaining callbacks:', this.widgetUpdateCallbacks.size);
  }

  removeConnectionStatusCallback(callback: ConnectionStatusCallback): void {
    this.connectionStatusCallbacks.delete(callback);
    console.log('📋 [WIDGET] Connection status callback removed. Remaining callbacks:', this.connectionStatusCallbacks.size);
  }

  getConnectionStatus(): string {
    return this.connectionStatus;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private setConnectionStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    this.connectionStatus = status;
    // Notify all registered callbacks of the status change
    this.connectionStatusCallbacks.forEach(cb => {
      try {
        cb(status);
      } catch (error) {
        console.error('❌ [WIDGET] Error in connection status callback:', error);
      }
    });
  }

  private validateAndPrepareToken(rawToken: string): string {
    // Trim whitespace
    const trimmed = rawToken.trim();
    
    // Validate token is not empty
    if (!trimmed) {
      throw new Error('Widget WebSocket token is empty after trimming');
    }

    // Check for potentially problematic characters
    const dangerousChars = ['#', '&', '=', '?', ' ', '%'];
    const foundDangerousChars = dangerousChars.filter(char => trimmed.includes(char));
    
    if (foundDangerousChars.length > 0) {
      console.warn('⚠️ [WIDGET] Token contains URL-unsafe characters:', foundDangerousChars);
    }

    // Additional validation

    return trimmed;
  }

  private buildSecureWebSocketUrl(baseUrl: string, token: string): string {
    try {
      // Use URL constructor for safe URL building
      const url = new URL(baseUrl);
      
      // Automatically encodes special characters
      url.searchParams.set('token', token);
      
      const finalUrl = url.toString();
      
      // Validate the final URL
      if (!finalUrl.startsWith('wss://')) {
        throw new Error('Widget WebSocket URL must use wss:// protocol');
      }
      
      return finalUrl;
    } catch (error) {
      console.error('❌ [WIDGET] Failed to build secure WebSocket URL:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid Widget WebSocket URL construction: ${errorMessage}`);
    }
  }

  private sanitizeUrlForLogging(url: string): string {
    try {
      const urlObj = new URL(url);
      const token = urlObj.searchParams.get('token');
      
      if (token) {
        // Replace token with safe preview for logging
        const safePreview = `${token.substring(0, 3)}...[HIDDEN]...${token.substring(token.length - 3)}`;
        urlObj.searchParams.set('token', safePreview);
      }
      
      return urlObj.toString();
    } catch {
      return url.replace(/token=[^&]+/, 'token=[HIDDEN_TOKEN]');
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('❌ [WIDGET] Reconnect failed:', error);
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        } else {
          console.error('❌ [WIDGET] Max reconnect attempts reached');
        }
      }
    }, this.reconnectDelay);
  }
}

// WebSocket connectivity test function
export const testWidgetWebSocketConnectivity = async (): Promise<{success: boolean, error?: string, latency?: number}> => {
  // CRITICAL: Only allow WebSocket connections on client-side to avoid SSR issues
  if (typeof window === 'undefined') {
    console.log('🚫 [WIDGET-WS-TEST] WebSocket test blocked during SSR - client-side only');
    return { success: false, error: 'WebSocket tests are only allowed on client-side' };
  }

  return new Promise((resolve) => {
    const startTime = Date.now();
    const testUrl = API_CONFIG.WS_RTS;
    
    const testSocket = new WebSocket(testUrl);
    
    const timeout = setTimeout(() => {
      testSocket.close();
      resolve({
        success: false,
        error: 'Connection timeout after 10 seconds'
      });
    }, 10000);
    
    testSocket.onopen = () => {
      const latency = Date.now() - startTime;
      clearTimeout(timeout);
      testSocket.close();
      resolve({
        success: true,
        latency
      });
    };
    
    testSocket.onerror = (error) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: `Connection error: ${error.type}`
      });
    };
    
    testSocket.onclose = (event) => {
      if (event.code !== 1000) { // Not normal closure
        clearTimeout(timeout);
        resolve({
          success: false,
          error: `Connection closed with code ${event.code}: ${event.reason}`
        });
      }
    };
  });
};

// Create singleton instance
const widgetDataWebSocket = new WidgetDataWebSocket();

export default widgetDataWebSocket;
export type { WidgetUpdateCallback, ConnectionStatusCallback };
