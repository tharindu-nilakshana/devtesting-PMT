import { API_CONFIG } from '../lib/api';

// TradingView WebSocket Manager - connects without token (domain-based authentication)
type PriceUpdateCallback = (data: Record<string, unknown>) => void;
type ConnectionStatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

interface WebSocketManager {
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols?: string[]) => void;
  switchSymbol: (newSymbol: string) => void;
  forceSubscribe: (symbol: string) => void;
  onPriceUpdate: (callback: PriceUpdateCallback) => void;
  onConnectionStatus: (callback: ConnectionStatusCallback) => void;
  removePriceUpdateCallback: (callback: PriceUpdateCallback) => void;
  removeConnectionStatusCallback: (callback: ConnectionStatusCallback) => void;
  getConnectionStatus: () => string;
}

class TradingViewWebSocket implements WebSocketManager {
  private ws: WebSocket | null = null;
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  // Support multiple listeners per event type
  private priceUpdateCallbacks: Set<PriceUpdateCallback> = new Set();
  private connectionStatusCallbacks: Set<ConnectionStatusCallback> = new Set();
  // Reference-count for widgets that require the socket
  private consumerCount = 0;
  // Track subscription ref-counts per symbol so widgets can share the feed safely
  private symbolRefCount: Map<string, number> = new Map();
  private subscribedSymbols: string[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Enable retries with 3 attempts
  private reconnectDelay = 5000; // 5 second retry delay
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false; // Flag to prevent multiple simultaneous connections
  private connectingPromise: Promise<void> | null = null; // Shared promise for concurrent connect calls
  private subscribeTimer: NodeJS.Timeout | null = null;
  private consolidationTimer: NodeJS.Timeout | null = null; // Safety timer to re-send all subscriptions
  private connectionReadyCallbacks: Set<() => void> = new Set(); // Callbacks to fire when connection is ready
  private debugWidgetTracking: Map<string, { symbols: string[], callbackCount: number }> = new Map(); // Track which widgets have registered

  // Acquire a shared WebSocket connection. Multiple widgets can call this; the real
  // network connection is only (re)opened when the first consumer appears.
  async connect(): Promise<void> {
    // CRITICAL: Only allow WebSocket connections on client-side to avoid SSR issues
    if (typeof window === 'undefined') {
      // console.log('🚫 [TRADINGVIEW] WebSocket connection blocked during SSR - client-side only');
      throw new Error('WebSocket connections are only allowed on client-side');
    }

    // If already connecting, increment count and return the existing promise so callers wait for it
    if (this.isConnecting && this.connectingPromise) {
      // console.log('🔗 [TRADINGVIEW] Connection already in progress, joining wait queue...');
      this.consumerCount++;
      return this.connectingPromise;
    }

    // If already connected, increment count and return immediately
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // console.log('✅ [TRADINGVIEW] Already connected, consumer count:', this.consumerCount + 1);
      this.consumerCount++;
      return Promise.resolve();
    }

    // Increment the logical consumer count for new connection
    this.consumerCount++;
    // console.log('📊 [TRADINGVIEW] Initiating connection, consumer count:', this.consumerCount);

    // Close any existing connection first (shouldn't happen in normal flow)
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      // console.warn('⚠️ [TRADINGVIEW] Closing stale connection before reconnecting');
      if (this.ws) {
        this.ws.close(1000, 'Reconnecting');
        this.ws = null;
      }
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Create and store the connection promise
    this.connectingPromise = new Promise<void>((resolve, reject) => {
      try {
        this.isConnecting = true;
        
        this.setConnectionStatus('connecting');

      // Connect directly to WebSocket without token - backend will allow domains
      const wsUrl = API_CONFIG.WS_TRADINGVIEW;
      
      // console.log('🔗 [TRADINGVIEW] Attempting to connect to WebSocket without token...');
      // console.log('🔗 [TRADINGVIEW] Base URL:', wsUrl);
      
      // Note: Browser WebSocket doesn't support SSL options like rejectUnauthorized
      // SSL certificate issues need to be resolved at the server level or by using a proxy
      // console.log('🔧 [TRADINGVIEW] Browser WebSocket - SSL verification handled by browser');
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // console.log('✅ [TRADINGVIEW] WebSocket connected successfully without token');
        this.isConnecting = false; // Reset connection flag
        this.setConnectionStatus('connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 5000; // Reset to configured delay
        
        // Clear any existing subscription timer
        if (this.subscribeTimer) {
          clearTimeout(this.subscribeTimer);
          this.subscribeTimer = null;
        }
        
        // console.log('📊 [TRADINGVIEW] Connection opened, checking for pending subscriptions...');
        // console.log('📊 [TRADINGVIEW] Current symbolRefCount:', Array.from(this.symbolRefCount.entries()));
        // console.log('📊 [TRADINGVIEW] Current subscribedSymbols:', this.subscribedSymbols);
        
        // Use a small delay to ensure connection is fully stable before subscribing
        setTimeout(() => {
          // Re-subscribe to symbols if we had any
          if (this.subscribedSymbols.length > 0) {
            // console.log('📊 [TRADINGVIEW] Re-subscribing to existing symbols:', this.subscribedSymbols);
            this.subscribe(this.subscribedSymbols);
          } else if (this.symbolRefCount.size > 0) {
            // If we have symbols in ref count but not in subscribedSymbols, subscribe to them
            const pendingSymbols = Array.from(this.symbolRefCount.keys());
            // console.log('📊 [TRADINGVIEW] Found pending symbols in ref count:', pendingSymbols);
            this.subscribe(pendingSymbols);
          } else {
            // console.log('📊 [TRADINGVIEW] No symbols to subscribe to on connection open');
          }
        }, 100); // Small delay to ensure connection is stable
        
        // Resolve the connection promise AFTER the delay, so all pending connect() calls can proceed
        this.connectingPromise = null; // Clear the promise
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // console.log('📨 [TRADINGVIEW] Message received:', {
          //   symbol: data.symbol || data.Symbol || data.S || data.s,
          //   price: data.price || data.Price || data.last || data.Last || data.close || data.Close || data.c,
          //   timestamp: data.timestamp || data.Timestamp || data.t,
          //   rawData: data
          // });
          
          // console.log(`📨 [TRADINGVIEW] Will broadcast to ${this.priceUpdateCallbacks.size} callbacks`);
          
          // Broadcast to all listeners
          let successCount = 0;
          let errorCount = 0;
          this.priceUpdateCallbacks.forEach(cb => {
            try {
              // console.log('📨 [TRADINGVIEW] Calling callback...');
              cb(data);
              successCount++;
              // console.log('📨 [TRADINGVIEW] Callback succeeded');
            } catch (err) {
              errorCount++;
              // console.error('📨 [TRADINGVIEW] Callback error:', err);
            }
          });
          
          // console.log(`📨 [TRADINGVIEW] Broadcast complete: ${successCount} success, ${errorCount} errors`);
        } catch (error) {
          // console.error('📊 [TRADINGVIEW] Error parsing message:', error);
          // console.error('📊 [TRADINGVIEW] Raw message:', event.data);
        }
      };

      this.ws.onclose = (event) => {
        // console.log(`📊 [TRADINGVIEW] Connection closed with code ${event.code}: ${event.reason}`);
        // console.log('📊 [TRADINGVIEW] Close event details:', {
        //   code: event.code,
        //   reason: event.reason,
        //   wasClean: event.wasClean,
        //   readyState: this.ws?.readyState,
        //   url: wsUrl
        // });
        this.setConnectionStatus('disconnected');
        this.isConnecting = false; // Reset connection flag
        this.connectingPromise = null; // Clear the promise
        this.ws = null;
        
        // Clear subscription timer if connection closed
        if (this.subscribeTimer) {
          clearTimeout(this.subscribeTimer);
          this.subscribeTimer = null;
        }
        
        // Attempt to reconnect if not manually disconnected
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = () => {
        // Silently handle WebSocket errors - they're handled by reconnection logic
        // Don't log to console to prevent UI error spillage
        this.setConnectionStatus('error');
        this.isConnecting = false;
        this.connectingPromise = null;
        // Resolve instead of reject to prevent unhandled promise rejections
        // The error state is communicated via setConnectionStatus('error')
        resolve();
      };

      } catch (error) {
        this.isConnecting = false; // Reset connection flag on error
        this.connectingPromise = null;
        this.setConnectionStatus('error');
        // console.error('📊 [TRADINGVIEW] Failed to connect:', error);
        reject(error);
      }
    });

    return this.connectingPromise;
  }

  // Release a consumer. The underlying socket is closed only when no one needs it.
  disconnect(): void {
    if (this.consumerCount > 0) {
      this.consumerCount--;
    }

    // If other widgets are still using the socket, keep it alive
    if (this.consumerCount > 0) {
      return;
    }
    
    // Clear all timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.subscribeTimer) {
      clearTimeout(this.subscribeTimer);
      this.subscribeTimer = null;
    }
    
    if (this.consolidationTimer) {
      clearTimeout(this.consolidationTimer);
      this.consolidationTimer = null;
    }
    
    // Reset connection flags
    this.isConnecting = false;
    this.connectingPromise = null;
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.setConnectionStatus('disconnected');
    this.subscribedSymbols = [];
  }

  // Subscribe to a list of symbols, reference-counting each so duplicates aren't sent.
  subscribe(symbols: string[]): void {
    // console.log('📊 [TRADINGVIEW] subscribe() called with symbols:', symbols);
    // console.log('📊 [TRADINGVIEW] WebSocket state:', this.ws?.readyState, 'OPEN =', WebSocket.OPEN);
    // console.log('📊 [TRADINGVIEW] Is connecting:', this.isConnecting);
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // console.log('📊 [TRADINGVIEW] WebSocket not ready, storing symbols for later subscription');
      // Store refs so we can subscribe once connected
      symbols.forEach(sym => {
        const count = this.symbolRefCount.get(sym) || 0;
        this.symbolRefCount.set(sym, count + 1);
        // console.log('📊 [TRADINGVIEW] Stored symbol', sym, 'with ref count:', count + 1);
      });
      return;
    }

    // Determine which symbols are actually new (not yet in subscribedSymbols)
    const newSymbols: string[] = [];
    symbols.forEach(sym => {
      const count = this.symbolRefCount.get(sym) || 0;
      this.symbolRefCount.set(sym, count + 1);
      // console.log('📊 [TRADINGVIEW] Symbol', sym, 'ref count:', count, '->', count + 1);
      // Check if symbol is NOT already subscribed, regardless of ref count
      if (!this.subscribedSymbols.includes(sym)) {
        newSymbols.push(sym);
      }
    });

    if (newSymbols.length === 0) {
      // console.log('📊 [TRADINGVIEW] All symbols already subscribed, skipping subscription');
      return;
    }

    // Merge into global subscribedSymbols set
    this.subscribedSymbols = Array.from(new Set([...this.subscribedSymbols, ...newSymbols]));

    // Log immediately so we can see what's happening
    // console.log('📊 [TRADINGVIEW] New symbols added:', newSymbols);
    // console.log('📊 [TRADINGVIEW] Updated subscribedSymbols:', [...this.subscribedSymbols]);

    // CRITICAL FIX: Server replaces subscriptions instead of adding to them
    // Always send ALL subscribed symbols in every subscription message

    // Batch subscriptions to avoid overwhelming the server when multiple widgets load
    // Use a longer delay to ensure all widgets have time to register their symbols
    if (this.subscribeTimer) {
      // console.log('📊 [TRADINGVIEW] Clearing existing timer, will batch with next call');
      clearTimeout(this.subscribeTimer);
    }
    
    this.subscribeTimer = setTimeout(() => {
      // console.log('📊 [TRADINGVIEW] Timer fired, preparing to send subscription');
      this.sendSubscriptionMessage();
    }, 300); // Batch subscriptions within 300ms window to catch multiple widget loads
    
    // Also set a consolidation timer as a safety net
    // This will re-send all subscriptions after a longer delay to handle edge cases
    if (this.consolidationTimer) {
      clearTimeout(this.consolidationTimer);
    }
    this.consolidationTimer = setTimeout(() => {
      // console.log('📊 [TRADINGVIEW] Consolidation timer fired, ensuring all symbols are subscribed');
      this.sendSubscriptionMessage();
      this.consolidationTimer = null;
    }, 1000); // Send a consolidated subscription after 1 second
  }
  
  // Helper method to send subscription message
  private sendSubscriptionMessage(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // console.log('📊 [TRADINGVIEW] Connection lost before sending subscription');
      return;
    }
    
    if (this.subscribedSymbols.length === 0) {
      // console.log('📊 [TRADINGVIEW] No symbols to subscribe to');
      return;
    }

    // IMPORTANT: Take a snapshot of subscribedSymbols at send time
    const symbolsToSend = [...this.subscribedSymbols];
    
    // Send ALL subscribed symbols (not just new ones) because server replaces subscriptions
    const subscribeMessage = {
      action: "subscribemulti",
      params: { symbols: symbolsToSend }
    };

    // console.log('📊 [TRADINGVIEW] Sending ALL subscribed symbols:', symbolsToSend);
    // console.log('📊 [TRADINGVIEW] Full subscription message:', JSON.stringify(subscribeMessage));
    
    try {
      this.ws!.send(JSON.stringify(subscribeMessage));
      // console.log('✅ [TRADINGVIEW] Subscription message sent successfully for symbols:', symbolsToSend);
    } catch (error) {
      // console.error('❌ [TRADINGVIEW] Failed to send subscription:', error);
    }
    
    this.subscribeTimer = null;
  }

  // Decrease reference counts; if any reach 0 send an unsubscribe message (if server protocol supports) & update subscribedSymbols.
  unsubscribe(symbols?: string[]): void {
    if (!symbols || symbols.length === 0) {
      return;
    }

    symbols.forEach(sym => {
      const count = this.symbolRefCount.get(sym) || 0;
      if (count > 1) {
        this.symbolRefCount.set(sym, count - 1);
      } else {
        this.symbolRefCount.delete(sym);
      }
    });

    // Identify which symbols were completely removed
    const removedSymbols = symbols.filter(sym => !this.symbolRefCount.has(sym));

    if (removedSymbols.length === 0) return;

    this.subscribedSymbols = this.subscribedSymbols.filter(sym => this.symbolRefCount.has(sym));

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // If server has an unsubscribe API we can send it here
    const unsubscribeMsg = {
      action: "unsubscribemulti",
      params: { symbols: removedSymbols }
    };

    // console.log('📊 [TRADINGVIEW] Unsubscribing from symbols:', removedSymbols);
    try {
      this.ws.send(JSON.stringify(unsubscribeMsg));
    } catch (err) {
      // console.error('📊 [TRADINGVIEW] Failed to send unsubscription:', err);
    }
  }

  // Switch to a new symbol - properly unsubscribe from old and subscribe to new
  switchSymbol(newSymbol: string): void {
    // console.log('🔄 [TRADINGVIEW] Switching symbol to:', newSymbol);
    
    // Get current subscribed symbols
    const currentSymbols = Array.from(this.symbolRefCount.keys());
    
    if (currentSymbols.length === 0) {
      // No current subscriptions, just subscribe to new symbol
      this.subscribe([newSymbol]);
      return;
    }
    
    // Check if new symbol is already subscribed
    if (currentSymbols.includes(newSymbol)) {
      // console.log('📊 [TRADINGVIEW] Symbol already subscribed:', newSymbol);
      return;
    }
    
    // Unsubscribe from all current symbols
    this.unsubscribe(currentSymbols);
    
    // Subscribe to new symbol
    this.subscribe([newSymbol]);
    
    // console.log('✅ [TRADINGVIEW] Symbol switched from', currentSymbols, 'to', newSymbol);
  }

  // Force subscription to a symbol - bypasses reference counting for debugging
  forceSubscribe(symbol: string): void {
    // console.log('🔧 [TRADINGVIEW] Force subscribing to:', symbol);
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // console.log('🔧 [TRADINGVIEW] WebSocket not ready for force subscription');
      return;
    }
    
    // Clear any existing ref count for this symbol
    this.symbolRefCount.delete(symbol);
    
    // Add to subscribed symbols if not already there
    if (!this.subscribedSymbols.includes(symbol)) {
      this.subscribedSymbols.push(symbol);
    }
    
    // Send subscription message directly
    const subscribeMessage = {
      action: "subscribemulti",
      params: { symbols: [symbol] }
    };
    
    // console.log('🔧 [TRADINGVIEW] Force sending subscription:', subscribeMessage);
    
    try {
      this.ws.send(JSON.stringify(subscribeMessage));
      // console.log('✅ [TRADINGVIEW] Force subscription sent successfully');
    } catch (error) {
      // console.error('❌ [TRADINGVIEW] Force subscription failed:', error);
    }
  }

  onPriceUpdate(callback: PriceUpdateCallback): void {
    this.priceUpdateCallbacks.add(callback);
    // console.log('📋 [TRADINGVIEW] Price update callback registered. Total callbacks:', this.priceUpdateCallbacks.size);
  }

  onConnectionStatus(callback: ConnectionStatusCallback): void {
    this.connectionStatusCallbacks.add(callback);
    // console.log('📋 [TRADINGVIEW] Connection status callback registered. Total callbacks:', this.connectionStatusCallbacks.size);
  }

  removePriceUpdateCallback(callback: PriceUpdateCallback): void {
    this.priceUpdateCallbacks.delete(callback);
    // console.log('📋 [TRADINGVIEW] Price update callback removed. Remaining callbacks:', this.priceUpdateCallbacks.size);
  }

  removeConnectionStatusCallback(callback: ConnectionStatusCallback): void {
    this.connectionStatusCallbacks.delete(callback);
    // console.log('📋 [TRADINGVIEW] Connection status callback removed. Remaining callbacks:', this.connectionStatusCallbacks.size);
  }

  // Debug method to get current state
  getDebugInfo(): Record<string, unknown> {
    return {
      connectionStatus: this.connectionStatus,
      wsReadyState: this.ws?.readyState,
      wsReadyStateLabel: this.ws ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.ws.readyState] : 'NULL',
      isConnecting: this.isConnecting,
      consumerCount: this.consumerCount,
      priceUpdateCallbacks: this.priceUpdateCallbacks.size,
      connectionStatusCallbacks: this.connectionStatusCallbacks.size,
      subscribedSymbols: [...this.subscribedSymbols],
      symbolRefCount: Object.fromEntries(this.symbolRefCount),
      reconnectAttempts: this.reconnectAttempts,
      hasConnectingPromise: !!this.connectingPromise,
      hasSubscribeTimer: !!this.subscribeTimer,
      hasConsolidationTimer: !!this.consolidationTimer
    };
  }

  getConnectionStatus(): string {
    return this.connectionStatus;
  }

  // Wait for connection to be ready before proceeding
  private async waitForConnection(timeoutMs: number = 5000): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.connectionReadyCallbacks.delete(callback);
        reject(new Error('Connection timeout'));
      }, timeoutMs);

      const callback = () => {
        clearTimeout(timeout);
        this.connectionReadyCallbacks.delete(callback);
        resolve();
      };

      this.connectionReadyCallbacks.add(callback);
    });
  }

  private setConnectionStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    this.connectionStatus = status;
    
    // Fire connection ready callbacks when connected
    if (status === 'connected') {
      this.connectionReadyCallbacks.forEach(cb => {
        try {
          cb();
        } catch {
          // Silent error handling
        }
      });
      this.connectionReadyCallbacks.clear();
    }
    
    this.connectionStatusCallbacks.forEach(cb => {
      try {
        cb(status);
      } catch {
        // Silent error handling
      }
    });
  }


  private sanitizeUrlForLogging(url: string): string {
    // Since we're not using tokens anymore, just return the URL as-is
    return url;
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    // console.log(`📊 [TRADINGVIEW] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        // console.error('📊 [TRADINGVIEW] Reconnect failed:', error);
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Max 30 seconds
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        } else {
          // console.error('📊 [TRADINGVIEW] Max reconnect attempts reached');
        }
      }
    }, this.reconnectDelay);
  }
}

// Create singleton instance
const tradingViewWebSocket = new TradingViewWebSocket();

// Expose debug info to window for troubleshooting
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).tradingViewWebSocketDebug = () => {
    const info = tradingViewWebSocket.getDebugInfo();
    console.log('🔍 [TRADINGVIEW DEBUG]', info);
    return info;
  };
}

export default tradingViewWebSocket;
export type { PriceUpdateCallback, ConnectionStatusCallback };
