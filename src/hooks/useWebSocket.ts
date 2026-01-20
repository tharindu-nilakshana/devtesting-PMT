'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  error: Error | null;
  send: (data: string | object) => void;
  reconnect: () => void;
  disconnect: () => void;
}

const DEFAULT_RECONNECT_INTERVAL = 3000;
const MAX_RECONNECT_INTERVAL = 30000;
const DEFAULT_MAX_ATTEMPTS = 5;

export function useWebSocket({
  url,
  onMessage,
  onOpen,
  onClose,
  onError,
  reconnect: shouldReconnect = true,
  reconnectInterval = DEFAULT_RECONNECT_INTERVAL,
  maxReconnectAttempts = DEFAULT_MAX_ATTEMPTS,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectIntervalRef = useRef(reconnectInterval);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to avoid recreating connect
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);

  // Update callback refs when they change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  }, [onMessage, onOpen, onClose, onError]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, [clearReconnectTimeout]);

  const connect = useCallback(() => {
    if (typeof window === 'undefined' || !url) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus('connecting');
    setError(null);

    try {
      console.log('[useWebSocket] Connecting to:', url);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('[useWebSocket] Connected to:', url);
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        reconnectIntervalRef.current = reconnectInterval;
        onOpenRef.current?.();
      };

      ws.onclose = (event) => {
        if (!mountedRef.current) return;
        console.log('[useWebSocket] Closed:', event.code, event.reason);
        setStatus('disconnected');
        onCloseRef.current?.();

        // Attempt reconnection
        if (shouldReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              reconnectAttemptsRef.current += 1;
              reconnectIntervalRef.current = Math.min(
                reconnectIntervalRef.current * 1.5,
                MAX_RECONNECT_INTERVAL
              );
              connect();
            }
          }, reconnectIntervalRef.current);
        }
      };

      ws.onerror = (event) => {
        if (!mountedRef.current) return;
        console.error('[useWebSocket] Error:', event);
        setStatus('error');
        setError(new Error('WebSocket connection error'));
        onErrorRef.current?.(event);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch {
          // If not JSON, pass raw data
          onMessageRef.current?.(event.data);
        }
      };
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err : new Error('Failed to create WebSocket'));
    }
  }, [url, shouldReconnect, reconnectInterval, maxReconnectAttempts]);

  const send = useCallback((data: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      console.log('[useWebSocket] Sending:', message);
      wsRef.current.send(message);
    } else {
      console.warn('[useWebSocket] Cannot send - WebSocket not open. State:', wsRef.current?.readyState);
    }
  }, []);

  const manualReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    reconnectIntervalRef.current = reconnectInterval;
    connect();
  }, [connect, reconnectInterval]);

  // Connect on mount, disconnect on unmount
  // Uses debounced cleanup to handle React Strict Mode double-invoke
  useEffect(() => {
    mountedRef.current = true;

    // Cancel any pending cleanup from Strict Mode's previous unmount
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    if (url) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      clearReconnectTimeout();

      // Delay cleanup to handle React Strict Mode double-invoke
      // In Strict Mode, the component will remount immediately and cancel this timeout
      cleanupTimeoutRef.current = setTimeout(() => {
        if (wsRef.current) {
          console.log('[useWebSocket] Executing delayed cleanup - closing WebSocket');
          wsRef.current.close();
          wsRef.current = null;
        }
      }, 100);
    };
  }, [url, connect, clearReconnectTimeout]);

  return {
    status,
    error,
    send,
    reconnect: manualReconnect,
    disconnect,
  };
}
