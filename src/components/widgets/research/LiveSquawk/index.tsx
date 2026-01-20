'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { Radio, Volume2, VolumeX, Play, Pause, AlertCircle } from 'lucide-react';
import { getLiveSquawkWebSocketUrl, type SquawkChannel } from './api';

interface SquawkUpdate {
  id: string;
  time: Date;
  content: string;
  priority?: 'high' | 'normal';
  category?: string;
}

interface LiveSquawkWidgetProps {
  id: string;
  onRemove: () => void;
  onSettings: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, any>;
  wgid?: string;
}

export function LiveSquawkWidget({ id, onRemove, onSettings, onFullscreen, settings, wgid }: LiveSquawkWidgetProps) {
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [updates, setUpdates] = useState<SquawkUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get widget ID - prioritize settings.customDashboardWidgetID, then wgid, then id prop
  const getWidgetId = useCallback((): number | null => {
    // First priority: Check settings.customDashboardWidgetID (most reliable)
    if (settings?.customDashboardWidgetID !== undefined && settings.customDashboardWidgetID !== null) {
      const parsedId = typeof settings.customDashboardWidgetID === 'string'
        ? parseInt(settings.customDashboardWidgetID, 10)
        : settings.customDashboardWidgetID;
      if (!isNaN(parsedId)) {
        return parsedId;
      }
    }
    // Second priority: Fallback to wgid prop
    if (wgid !== undefined && wgid !== null) {
      const parsedId = typeof wgid === 'string' ? parseInt(wgid, 10) : wgid;
      if (!isNaN(parsedId)) {
        return parsedId;
      }
    }
    // Third priority: Fallback to id prop (least reliable for database IDs, but always present)
    if (id !== undefined && id !== null) {
      const parsedId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (!isNaN(parsedId)) {
        return parsedId;
      }
    }
    return null;
  }, [id, wgid, settings]);

  const widgetId = getWidgetId();

  // Debug: Log widget info on mount
  useEffect(() => {
    console.log('📻 [Live Squawk] Widget mounted/updated:', {
      id,
      wgid,
      settings,
      widgetId,
      isLive,
      updatesCount: updates.length
    });
  }, [id, wgid, settings, widgetId, isLive, updates.length]);

  // Connect to WebSocket when isLive is true
  useEffect(() => {
    console.log('📻 [Live Squawk] useEffect triggered, isLive:', isLive, 'widgetId:', widgetId);
    
    // CRITICAL: Only connect WebSocket on client-side to avoid SSR issues
    if (typeof window === 'undefined') {
      console.log('🚫 [Live Squawk] Skipping WebSocket connection during SSR');
      return;
    }

    if (!isLive) {
      // Disconnect when paused
      if (wsRef.current) {
        console.log('📻 [Live Squawk] Disconnecting WebSocket (paused)');
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    if (!widgetId) {
      console.warn('⚠️ [Live Squawk] Widget ID not found, available props:', { id, wgid, settings });
      setError('Widget ID not found. Please check widget configuration.');
      setIsLive(false);
      return;
    }

    const connectWebSocket = async () => {
      setIsConnecting(true);
      setError(null);
      console.log('📻 [Live Squawk] Starting WebSocket connection process...');

      try {
        // Get WebSocket URL
        console.log('📻 [Live Squawk] Fetching WebSocket URL...');
        let wsUrlResponse;
        try {
          wsUrlResponse = await getLiveSquawkWebSocketUrl();
          console.log('📻 [Live Squawk] WebSocket URL response:', wsUrlResponse);
        } catch (apiError) {
          console.error('📻 [Live Squawk] API call failed:', apiError);
          throw new Error(`Failed to fetch WebSocket URL: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
        }
        
        if (!wsUrlResponse) {
          console.error('📻 [Live Squawk] WebSocket URL response is null');
          throw new Error('API returned null response');
        }
        
        if (!wsUrlResponse.websocketUrl) {
          console.error('📻 [Live Squawk] WebSocket URL missing from response:', wsUrlResponse);
          throw new Error('WebSocket URL not found in API response');
        }
        
        console.log('📻 [Live Squawk] WebSocket URL extracted:', wsUrlResponse.websocketUrl.substring(0, 50) + '...');

        const wsUrl = wsUrlResponse.websocketUrl;
        console.log('📻 [Live Squawk] Connecting to WebSocket:', wsUrl);
        console.log('📻 [Live Squawk] Token from response:', wsUrlResponse.token?.substring(0, 50) + '...');
        
        // Verify URL is valid
        if (!wsUrl || !wsUrl.startsWith('wss://') && !wsUrl.startsWith('ws://')) {
          throw new Error(`Invalid WebSocket URL: ${wsUrl}`);
        }
        
        // Create WebSocket connection immediately after getting URL
        // (tokens may expire quickly)
        let ws: WebSocket;
        try {
          ws = new WebSocket(wsUrl);
          console.log('📻 [Live Squawk] WebSocket created, readyState:', ws.readyState);
        } catch (wsError) {
          console.error('❌ [Live Squawk] Failed to create WebSocket:', wsError);
          throw new Error(`Failed to create WebSocket: ${wsError instanceof Error ? wsError.message : 'Unknown error'}`);
        }
        wsRef.current = ws;
        
        // Set a connection timeout (some servers may take time to respond)
        const connectionTimeoutMs = 10000; // 10 seconds
        const connectionStartTime = Date.now();
        
        // Set a timeout to show feedback if connection takes too long
        let connectionTimeout: NodeJS.Timeout | null = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            console.warn('📻 [Live Squawk] WebSocket connection is taking longer than expected...');
            // Add a status message
            const statusUpdate: SquawkUpdate = {
              id: `status-${Date.now()}`,
              time: new Date(),
              content: 'Connecting to live squawk stream...',
              priority: 'normal',
              category: 'System',
            };
            setUpdates((prev) => {
              if (prev.length === 0 || prev[0].id !== statusUpdate.id) {
                const updated = [statusUpdate, ...prev].slice(0, 50);
                console.log('📻 [Live Squawk] Status message added, total updates:', updated.length);
                return updated;
              }
              return prev;
            });
          }
        }, 2000);

        ws.onopen = () => {
          const connectionTime = Date.now() - connectionStartTime;
          console.log(`✅ [Live Squawk] WebSocket connected successfully after ${connectionTime}ms`);
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
          setIsConnecting(false);
          setError(null);
          
          // Add a connection confirmation message
          const connectionUpdate: SquawkUpdate = {
            id: `connection-${Date.now()}`,
            time: new Date(),
            content: 'Connected to live squawk stream. Waiting for updates...',
            priority: 'normal',
            category: 'System',
          };
          console.log('📻 [Live Squawk] About to add connection message:', connectionUpdate);
          setUpdates((prev) => {
            // Remove any pending status or error messages
            const filtered = prev.filter(u => !u.id.startsWith('status-') && !u.id.startsWith('error-'));
            const updated = [connectionUpdate, ...filtered].slice(0, 50);
            console.log('📻 [Live Squawk] Connection message added, total updates:', updated.length, 'First update:', updated[0]);
            return updated;
          });
          // Force a re-render check
          setTimeout(() => {
            console.log('📻 [Live Squawk] State check after connection - updates count should be > 0');
          }, 100);
        };

        ws.onmessage = (event) => {
          try {
            console.log('📻 [Live Squawk] Raw message received:', event.data);
            
            // Try to parse as JSON first
            let data: any;
            try {
              data = JSON.parse(event.data);
              console.log('📻 [Live Squawk] Parsed JSON data:', data);
            } catch {
              // If not JSON, treat as plain text
              console.log('📻 [Live Squawk] Plain text message, creating update');
              const newUpdate: SquawkUpdate = {
                id: Date.now().toString(),
                time: new Date(),
                content: event.data.toString().trim(),
                priority: 'normal',
              };
              setUpdates((prev) => [newUpdate, ...prev].slice(0, 50));
              return;
            }

            // Handle different message formats
            // Case 1: Direct content/message/text field
            if (data.content || data.message || data.text) {
              const newUpdate: SquawkUpdate = {
                id: data.id || Date.now().toString(),
                time: data.timestamp ? new Date(data.timestamp) : new Date(),
                content: data.content || data.message || data.text || '',
                priority: data.priority === 'high' || data.important ? 'high' : 'normal',
                category: data.category || data.section || data.type || undefined,
              };
              console.log('📻 [Live Squawk] Created update from content/message/text:', newUpdate);
              setUpdates((prev) => {
                const updated = [newUpdate, ...prev].slice(0, 50);
                console.log('📻 [Live Squawk] State updated, total updates:', updated.length);
                return updated;
              });
              return;
            }

            // Case 2: Nested data structure
            if (data.data) {
              const nestedData = data.data;
              if (nestedData.content || nestedData.message || nestedData.text || typeof nestedData === 'string') {
                const newUpdate: SquawkUpdate = {
                  id: nestedData.id || data.id || Date.now().toString(),
                  time: nestedData.timestamp || data.timestamp ? new Date(nestedData.timestamp || data.timestamp) : new Date(),
                  content: nestedData.content || nestedData.message || nestedData.text || (typeof nestedData === 'string' ? nestedData : ''),
                  priority: nestedData.priority === 'high' || nestedData.important || data.priority === 'high' ? 'high' : 'normal',
                  category: nestedData.category || nestedData.section || nestedData.type || data.category || undefined,
                };
                console.log('📻 [Live Squawk] Created update from nested data:', newUpdate);
                setUpdates((prev) => [newUpdate, ...prev].slice(0, 50));
                return;
              }
            }

            // Case 3: Array of messages
            if (Array.isArray(data)) {
              console.log('📻 [Live Squawk] Received array of messages:', data.length);
              const newUpdates: SquawkUpdate[] = data.map((item: any, index: number) => ({
                id: item.id || `${Date.now()}-${index}`,
                time: item.timestamp ? new Date(item.timestamp) : new Date(),
                content: item.content || item.message || item.text || JSON.stringify(item),
                priority: item.priority === 'high' || item.important ? 'high' : 'normal',
                category: item.category || item.section || item.type || undefined,
              }));
              setUpdates((prev) => [...newUpdates, ...prev].slice(0, 50));
              return;
            }

            // Case 4: If data itself is a string
            if (typeof data === 'string' && data.trim()) {
      const newUpdate: SquawkUpdate = {
        id: Date.now().toString(),
        time: new Date(),
                content: data.trim(),
                priority: 'normal',
              };
              console.log('📻 [Live Squawk] Created update from string data:', newUpdate);
              setUpdates((prev) => [newUpdate, ...prev].slice(0, 50));
              return;
            }

            // Case 5: Try to extract any text-like field
            const textFields = Object.keys(data).filter(key => 
              typeof data[key] === 'string' && 
              data[key].length > 10 && 
              !key.toLowerCase().includes('id') &&
              !key.toLowerCase().includes('time')
            );
            
            if (textFields.length > 0) {
              const contentField = textFields[0];
              const newUpdate: SquawkUpdate = {
                id: data.id || Date.now().toString(),
                time: data.timestamp ? new Date(data.timestamp) : new Date(),
                content: data[contentField],
                priority: data.priority === 'high' || data.important ? 'high' : 'normal',
                category: data.category || data.section || data.type || undefined,
              };
              console.log('📻 [Live Squawk] Created update from text field:', contentField, newUpdate);
      setUpdates((prev) => [newUpdate, ...prev].slice(0, 50));
              return;
            }

            console.warn('📻 [Live Squawk] Unknown message format, logging full data:', data);
          } catch (err) {
            console.error('📻 [Live Squawk] Error processing WebSocket message:', err, event.data);
          }
        };

        ws.onerror = (error) => {
          // WebSocket error events don't expose details directly, so we log the WebSocket state instead
          const errorInfo = {
            errorType: error.type || 'unknown',
            readyState: ws.readyState,
            readyStateText: ws.readyState === WebSocket.CONNECTING ? 'CONNECTING' :
                           ws.readyState === WebSocket.OPEN ? 'OPEN' :
                           ws.readyState === WebSocket.CLOSING ? 'CLOSING' :
                           ws.readyState === WebSocket.CLOSED ? 'CLOSED' : 'UNKNOWN',
            url: ws.url ? ws.url.substring(0, 100) + '...' : 'no URL',
            protocol: ws.protocol || 'no protocol',
            extensions: ws.extensions || 'no extensions',
            timestamp: new Date().toISOString()
          };
          
          console.warn('⚠️ [Live Squawk] WebSocket error occurred:', errorInfo);
          
          // Get more details about the error based on WebSocket state
          let errorMessage = 'Connection error. The server may be rejecting the connection.';
          if (ws.readyState === WebSocket.CLOSED) {
            errorMessage = 'WebSocket connection closed unexpectedly. The authentication token may have expired or the server may be rejecting connections. Attempting to reconnect with a fresh token...';
          } else if (ws.readyState === WebSocket.CLOSING) {
            errorMessage = 'WebSocket is closing. This may indicate an authentication or protocol issue. Attempting to reconnect...';
          } else if (ws.readyState === WebSocket.CONNECTING) {
            errorMessage = 'WebSocket connection failed during handshake. This could be due to an expired token, server unavailability, or network issues. Attempting to reconnect...';
          }
          
          setError(errorMessage);
          setIsConnecting(false);
          
          // Add error message to updates so user sees feedback
          const errorUpdate: SquawkUpdate = {
            id: `error-${Date.now()}`,
            time: new Date(),
            content: errorMessage,
            priority: 'high',
            category: 'Error',
          };
          setUpdates((prev) => {
            // Only add if we don't already have a recent error (within last 5 seconds)
            const recentError = prev.find(u => u.id.startsWith('error-') && Date.now() - u.time.getTime() < 5000);
            if (!recentError) {
              const updated = [errorUpdate, ...prev].slice(0, 50);
              console.log('📻 [Live Squawk] Error message added, total updates:', updated.length);
              return updated;
            }
            return prev;
          });
        };

        ws.onclose = (event) => {
          console.log('📻 [Live Squawk] WebSocket closed:', {
            code: event.code,
            reason: event.reason || 'No reason provided',
            wasClean: event.wasClean,
            readyState: ws.readyState
          });
          
          // Error code meanings:
          // 1000 = Normal closure
          // 1001 = Going away
          // 1002 = Protocol error
          // 1003 = Unsupported data
          // 1006 = Abnormal closure (no close frame received)
          // 1007 = Invalid frame payload data
          // 1008 = Policy violation
          // 1009 = Message too big
          // 1011 = Internal server error
          
          if (event.code === 1006) {
            console.warn('⚠️ [Live Squawk] Abnormal closure (1006) - Connection closed without proper handshake. Possible causes:');
            console.warn('   - Network connectivity issues');
            console.warn('   - Server rejecting connection');
            console.warn('   - Expired or invalid token');
            console.warn('   - CORS or security policy blocking connection');
            console.warn('   - Protocol mismatch');
          }
          
          wsRef.current = null;

          // Attempt to reconnect if still live and not a normal closure
          if (isLive && event.code !== 1000) {
            const reconnectDelay = event.code === 1006 ? 5000 : 3000; // Wait longer for 1006 errors
            console.log(`📻 [Live Squawk] Attempting to reconnect in ${reconnectDelay/1000} seconds...`);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isLive) {
                console.log('📻 [Live Squawk] Reconnecting...');
                connectWebSocket();
              }
            }, reconnectDelay);
          } else {
            setIsConnecting(false);
          }
        };
      } catch (err) {
        console.error('📻 [Live Squawk] Error connecting to WebSocket:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
        setError(errorMessage);
        setIsConnecting(false);
        setIsLive(false);
        
        // Add error message to updates so user sees feedback
        const errorUpdate: SquawkUpdate = {
          id: `error-${Date.now()}`,
          time: new Date(),
          content: `Connection failed: ${errorMessage}`,
          priority: 'high',
          category: 'Error',
        };
        setUpdates((prev) => {
          const updated = [errorUpdate, ...prev].slice(0, 50);
          console.log('📻 [Live Squawk] Error update added, total updates:', updated.length);
          return updated;
        });
      }
    };

    connectWebSocket();

    // Cleanup on unmount or when isLive changes
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [isLive, widgetId]);

  // Log when isLive changes
  useEffect(() => {
    console.log('📻 [Live Squawk] isLive state changed:', isLive, 'widgetId:', widgetId);
  }, [isLive, widgetId]);

  // Log when updates change
  useEffect(() => {
    console.log('📻 [Live Squawk] Updates state changed:', {
      count: updates.length,
      isLive,
      updates: updates.map(u => ({ id: u.id, content: u.content?.substring(0, 30) || 'no content' }))
    });
  }, [updates, isLive]);

  // Auto-scroll to top when new updates arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [updates, autoScroll]);

  // Handle manual scroll - disable auto-scroll if user scrolls down
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop } = scrollRef.current;
      setAutoScroll(scrollTop < 50);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="h-full flex flex-col bg-card text-card-foreground rounded-lg border border-border overflow-hidden">
      <WidgetHeader title="Live Squawk" onRemove={onRemove} onFullscreen={onFullscreen} />

      {/* Play Button with Indicator */}
      <div className="px-4 py-3 border-b border-border/50 bg-background/50">
        <div className="flex items-center gap-2">
          {/* Volume/Mute Icon - separate button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full hover:bg-muted/50 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
            disabled={!isLive}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-muted-foreground" />}
          </button>
          
          {/* Main Play/Pause Button */}
          <button
            onClick={() => {
              console.log('📻 [Live Squawk] Button clicked, current isLive:', isLive);
              console.log('📻 [Live Squawk] Widget ID:', widgetId);
              setIsLive(!isLive);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full transition-all border ${
              isLive 
                ? 'bg-primary text-white border-primary shadow-sm hover:bg-primary/90' 
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
            }`}
          >
          {/* Text */}
          <span className="text-xs font-medium uppercase tracking-wider whitespace-nowrap">
            {isLive ? 'Listen to our analysts' : 'Start listening'}
          </span>
          
          {/* Animated Waveform - when playing */}
          {isLive && !isMuted && (
            <div className="flex items-center gap-0.5 h-5">
              <div className="w-0.5 bg-white rounded-full animate-waveform-1" style={{ height: '40%' }} />
              <div className="w-0.5 bg-white rounded-full animate-waveform-2" style={{ height: '60%' }} />
              <div className="w-0.5 bg-white rounded-full animate-waveform-3" style={{ height: '80%' }} />
              <div className="w-0.5 bg-white rounded-full animate-waveform-4" style={{ height: '100%' }} />
              <div className="w-0.5 bg-white rounded-full animate-waveform-5" style={{ height: '70%' }} />
              <div className="w-0.5 bg-white rounded-full animate-waveform-6" style={{ height: '50%' }} />
              <div className="w-0.5 bg-white rounded-full animate-waveform-7" style={{ height: '65%' }} />
            </div>
          )}
          
          {/* Live Indicator - animated green dot (when muted) */}
          {isLive && isMuted && (
            <div className="flex items-center justify-center">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
              </span>
            </div>
          )}
          
          {/* Play/Pause Icon */}
          {!isLive && <Play className="w-4 h-4 ml-1" />}
        </button>
        </div>
      </div>

      {/* Live Stream Status */}
      {isLive && (
        <div className={`px-4 py-2 border-b ${
          error 
            ? 'bg-destructive/10 border-destructive/20' 
            : isConnecting
            ? 'bg-warning/10 border-warning/20'
            : 'bg-success/10 border-success/20'
        }`}>
          <div className={`flex items-center gap-2 text-[10px] ${
            error 
              ? 'text-destructive' 
              : isConnecting
              ? 'text-warning'
              : 'text-success'
          }`}>
            <span className="relative flex h-1.5 w-1.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                error 
                  ? 'bg-destructive' 
                  : isConnecting
                  ? 'bg-warning'
                  : 'bg-success'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                error 
                  ? 'bg-destructive' 
                  : isConnecting
                  ? 'bg-warning'
                  : 'bg-success'
              }`}></span>
            </span>
            <span className="font-medium">
              {error 
                ? error
                : isConnecting
                ? 'Connecting to live stream...'
                : 'Live Stream Connected. Our analyst will only talk if there is news. Wait patiently for their comment.'}
            </span>
          </div>
        </div>
      )}

      {/* Updates Feed */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-gradient-to-b from-background/50 to-background/30"
      >
        {(() => {
          console.log('📻 [Live Squawk] Rendering updates list - count:', updates.length, 'isLive:', isLive);
          if (updates.length === 0) {
            console.log('📻 [Live Squawk] Rendering empty state');
            return (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-muted-foreground text-sm mb-2">No updates yet</div>
                  <div className="text-xs text-muted-foreground/70">
                    {isLive ? 'Waiting for live updates...' : 'Start listening to receive updates'}
                  </div>
                </div>
              </div>
            );
          }
          console.log('📻 [Live Squawk] Rendering', updates.length, 'updates');
          return updates.map((update, index) => {
            console.log('📻 [Live Squawk] Rendering update:', index, update.id, update.content?.substring(0, 50) || 'no content');
            return (
          <div
            key={update.id}
            className={`group px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-all ${
              index === 0 && isLive ? 'bg-destructive/5 animate-in fade-in slide-in-from-top-2 duration-500' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Time */}
              <div className="flex flex-col items-end min-w-[65px] pt-0.5">
                <div className="text-[11px] text-foreground font-mono tabular-nums">
                  {formatTime(update.time)}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {getRelativeTime(update.time)}
                </div>
              </div>

              {/* Live indicator for latest update */}
              {index === 0 && isLive && (
                <div className="flex-shrink-0 pt-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                  </span>
                </div>
              )}

              {/* Priority indicator */}
              {update.priority === 'high' && (
                <div className="flex-shrink-0 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 text-primary" />
                </div>
              )}

              {/* Content */}
              <div className="flex-1">
                {/* Category badge */}
                {update.category && (
                  <div className="inline-block px-2 py-0.5 rounded-full bg-muted/50 text-[9px] text-muted-foreground uppercase tracking-wider mb-1.5">
                    {update.category}
                  </div>
                )}
                
                <div className={`text-sm leading-relaxed ${
                  update.priority === 'high' ? 'text-foreground font-medium' : 'text-foreground/90'
                }`}>
                  {update.content}
                </div>
              </div>
            </div>
          </div>
            );
          });
        })()}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border/50 bg-muted/20 backdrop-blur-sm">
        <div className="flex items-center justify-between text-[10px]">
          <div className="text-muted-foreground/70">
            {updates.length} updates • {isLive ? 'Broadcasting' : 'Paused'}
          </div>
          {!autoScroll && (
            <button
              onClick={() => {
                setAutoScroll(true);
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
              }}
              className="text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Jump to latest
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveSquawkWidget;
