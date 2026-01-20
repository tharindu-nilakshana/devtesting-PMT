/**
 * @file WebSocketService.ts
 * @description Enhanced WebSocket service with heartbeat, reconnection, and sequence validation
 */

import { Trade, ConnectionStatus, WebSocketConfig, INSTRUMENTS } from '../types';

const DEFAULT_CONFIG: WebSocketConfig = {
  url: 'wss://sockets.primemarket-terminal.com:8081?token=4288ab00d00da44c90f4a8ab6764dd0062e33ac0d6a9669b60c6b6ebb6fba071',
  symbols: INSTRUMENTS,
  reconnectAttempts: 5,
  reconnectDelay: 1000,
  heartbeatInterval: 30000,
  bufferFlushInterval: 200
};

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private onTrade: (trades: Trade[]) => void;
  private onStatusChange: (status: ConnectionStatus) => void;
  
  // Buffer for batching trades
  private buffer: Trade[] = [];
  private flushIntervalId: ReturnType<typeof setInterval> | null = null;
  
  // Reconnection state
  private reconnectAttempts = 0;
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalClose = false;
  
  // Heartbeat state
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastPongTime: number = 0;
  
  // Sequence tracking
  private lastSequence: number = 0;
  private sequenceGaps: number[] = [];

  constructor(
    onTrade: (trades: Trade[]) => void,
    onStatusChange: (status: ConnectionStatus) => void,
    config: Partial<WebSocketConfig> = {}
  ) {
    this.onTrade = onTrade;
    this.onStatusChange = onStatusChange;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn('[WS] Already connected');
      return;
    }

    this.isIntentionalClose = false;
    this.onStatusChange('connecting');

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WS] Connection failed:', error);
      this.onStatusChange('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.isIntentionalClose = true;
    this.cleanup();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.onStatusChange('disconnected');
  }

  /**
   * Subscribe to specific symbols
   */
  public subscribe(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot subscribe: not connected');
      return;
    }

    const msg = {
      action: 'subscribemulti',
      params: { symbols }
    };
    
    this.ws.send(JSON.stringify(msg));
    console.log('[WS] Subscribed to:', symbols);
  }

  /**
   * Unsubscribe from specific symbols
   */
  public unsubscribe(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const msg = {
      action: 'unsubscribemulti',
      params: { symbols }
    };
    
    this.ws.send(JSON.stringify(msg));
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    connected: boolean;
    reconnectAttempts: number;
    sequenceGaps: number[];
    bufferSize: number;
  } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      reconnectAttempts: this.reconnectAttempts,
      sequenceGaps: [...this.sequenceGaps],
      bufferSize: this.buffer.length
    };
  }

  // ==================================================================================
  // PRIVATE METHODS
  // ==================================================================================

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.onStatusChange('connected');
      this.reconnectAttempts = 0;
      
      // Subscribe to default symbols
      this.subscribe(this.config.symbols);
      
      // Start buffering and heartbeat
      this.startBuffering();
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('[WS] Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[WS] Closed:', event.code, event.reason);
      this.cleanup();
      
      if (!this.isIntentionalClose) {
        this.onStatusChange('disconnected');
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
      this.onStatusChange('error');
    };
  }

  private handleMessage(data: unknown): void {
    // Handle pong for heartbeat
    if (data && typeof data === 'object' && 'type' in data && (data as { type: string }).type === 'pong') {
      this.lastPongTime = Date.now();
      return;
    }

    // Handle trade data
    const incoming = Array.isArray(data) ? data : [data];
    
    for (const item of incoming) {
      if (!this.isValidTrade(item)) continue;

      // Sequence validation
      const sequence = item.sequence as number | undefined;
      if (sequence !== undefined && sequence !== null) {
        if (this.lastSequence > 0 && sequence !== this.lastSequence + 1) {
          const gap = sequence - this.lastSequence - 1;
          this.sequenceGaps.push(gap);
          console.warn(`[WS] Sequence gap detected: ${gap} messages missed`);
        }
        this.lastSequence = sequence;
      }

      const trade: Trade = {
        orderflow_id: (item.orderflow_id as number) || Date.now() + Math.random(),
        symbol: item.symbol as string,
        datetime: (item.datetime as string) || new Date().toISOString(),
        price: Number(item.price),
        trade_condition: Number(item.trade_condition) || 1,
        trade_size: Number(item.trade_size) || Number(item.size) || 1
      };
      
      this.buffer.push(trade);
    }
  }

  private isValidTrade(item: unknown): item is Record<string, unknown> {
    return (
      item !== null &&
      typeof item === 'object' &&
      'symbol' in item &&
      'price' in item
    );
  }

  private startBuffering(): void {
    this.stopBuffering();
    
    this.flushIntervalId = setInterval(() => {
      if (this.buffer.length > 0) {
        // Batch trades for efficiency
        const trades = [...this.buffer];
        this.buffer = [];
        this.onTrade(trades);
      }
    }, this.config.bufferFlushInterval);
  }

  private stopBuffering(): void {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatIntervalId = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send ping
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        
        // Check if we received a pong recently
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (this.lastPongTime > 0 && timeSinceLastPong > this.config.heartbeatInterval * 2) {
          console.warn('[WS] Heartbeat timeout, reconnecting...');
          this.ws.close(4000, 'Heartbeat timeout');
        }
      }
    }, this.config.heartbeatInterval);
    
    this.lastPongTime = Date.now();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.isIntentionalClose) return;
    if (this.reconnectAttempts >= this.config.reconnectAttempts) {
      console.error('[WS] Max reconnection attempts reached');
      this.onStatusChange('error');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.calculateBackoff();
    
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.onStatusChange('reconnecting');

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private calculateBackoff(): number {
    // Exponential backoff with jitter
    const base = this.config.reconnectDelay;
    const exponential = Math.min(base * Math.pow(2, this.reconnectAttempts - 1), 30000);
    const jitter = Math.random() * 1000;
    return exponential + jitter;
  }

  private cleanup(): void {
    this.stopBuffering();
    this.stopHeartbeat();
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    
    // Flush remaining buffer
    if (this.buffer.length > 0) {
      this.onTrade([...this.buffer]);
      this.buffer = [];
    }
  }
}
