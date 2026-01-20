"use client";

import { useEffect, useRef } from 'react';
import widgetDataWebSocket from '@/utils/widgetWebSocket';
import tradingViewWebSocket from '@/utils/tradingViewWebSocket';

// Map of WebSocket widget names to tab keys and alert messages (same as NotificationsPanel)
const WIDGET_TO_TAB_MAP: Record<string, { tabs: string[]; alertMessage: string }> = {
  'UserNotification': { 
    tabs: ['all', 'analyst-files'],
    alertMessage: 'Notification Alert: User notification update'
  },
  'realtimenews': { 
    tabs: ['real-time-news'],
    alertMessage: 'Notification Alert: Real time news notification'
  },
  'EventCalendar': { 
    tabs: ['event-calendar'],
    alertMessage: 'Notification Alert: Calendar event notification'
  },
};

export default function WSBoot() {
  const startedRef = useRef(false);
  
  useEffect(() => {
    // CRITICAL: Only initialize WebSocket connections on client-side to avoid SSR issues
    if (typeof window === 'undefined') {
      console.log('🚫 [WSBoot] Skipping WebSocket initialization during SSR');
      return;
    }

    if (startedRef.current) return;
    startedRef.current = true;

     
    console.log('🔌 [WSBoot] Initializing WebSocket connections...');

    // Set up widget data WebSocket for refresh notifications
    widgetDataWebSocket.onWidgetUpdate((widgetName) => {
      // Log ALL widget updates - no filtering
       
      console.log('🎯 [WSBoot] WIDGET UPDATE:', widgetName);
      
      // Always dispatch the raw event for widgets to listen to
      try {
        window.dispatchEvent(new CustomEvent('pmt-rts', { detail: widgetName }));
      } catch {}
      
      // Handle specific known patterns without hardcoded filtering
      if (typeof widgetName === 'string' && widgetName.startsWith('CurrencyStrength')) {
        const timeline = widgetName.replace('CurrencyStrength', '');
        try {
          window.dispatchEvent(new CustomEvent('pmt-cs-refresh', { detail: { timeline } }));
        } catch {}
        
        // Legacy Currency Strength system removed - now using React widget with event listeners
      } else if (widgetName === 'realtimenews') {
        try {
          window.dispatchEvent(new CustomEvent('pmt-news-refresh'));
        } catch {}
      }
      // No hardcoded filtering - let widgets decide what to do with messages
    });

    // TradingView WebSocket for real-time price updates
    tradingViewWebSocket.onPriceUpdate((payload: any) => {
      try { 
        window.dispatchEvent(new CustomEvent('pmt-prices', { detail: payload })); 
        console.log('💰 [LIVE PRICES] Update received:', payload);
      } catch {}
    });

    // Set up connection status tracking
    widgetDataWebSocket.onConnectionStatus((status) => {
       
      console.log('📨 [WIDGET WS] Status:', status);
    });

    // TradingView WebSocket status tracking
    tradingViewWebSocket.onConnectionStatus((status) => {
      console.log('📊 [TRADINGVIEW WS] Status:', status);
    });

    // Notification WebSocket subscription (same logic as NotificationsPanel global listener)
    // This ensures search field can flash even when notification panel is closed
    let handleNotificationAlert: ((event: Event) => void) | null = null;
    let handleRtsAlert: ((event: Event) => void) | null = null;
    
    const setupNotificationWebSocket = async () => {
      try {
        console.log('🔔 [WSBoot] Setting up notification WebSocket listener...');

        // Handler for WebSocket events that dispatches alerts
        handleNotificationAlert = (event: Event) => {
          try {
            const customEvent = event as CustomEvent<{
              widgetName: string;
              data: any;
              rawData: string;
              timestamp: string;
            }>;
            
            const widgetName = customEvent.detail?.widgetName;
            if (!widgetName) return;

            const widgetKey = String(widgetName || '').trim();
            
            // Check if this widget update is relevant for notifications
            const matchingEntry = Object.entries(WIDGET_TO_TAB_MAP).find(([key]) => {
              const keyLower = key.toLowerCase();
              const widgetLower = widgetKey.toLowerCase();
              return widgetLower === keyLower || widgetLower.includes(keyLower) || keyLower.includes(widgetLower);
            });

            if (matchingEntry) {
              const [, config] = matchingEntry;
              const { alertMessage } = config;
              
              // Always dispatch notification alert event to TopNav (even when panel is closed)
              const notificationAlertEvent = new CustomEvent('pmt-notification-alert', {
                detail: {
                  show: true,
                  message: alertMessage,
                  timestamp: Date.now()
                }
              });
              window.dispatchEvent(notificationAlertEvent);
              
              // Hide alert after 3 seconds
              setTimeout(() => {
                const hideAlertEvent = new CustomEvent('pmt-notification-alert', {
                  detail: {
                    show: false,
                    timestamp: Date.now()
                  }
                });
                window.dispatchEvent(hideAlertEvent);
              }, 3000);
            }
          } catch (error) {
            console.error('🔔 [WSBoot] Error handling notification alert:', error);
          }
        };

        // Also listen to pmt-rts events
        handleRtsAlert = (event: Event) => {
          try {
            const customEvent = event as CustomEvent<string>;
            const widgetName = customEvent.detail;
            if (!widgetName) return;

            const syntheticEvent = new CustomEvent('pmt-widget-data', {
              detail: { widgetName }
            });
            if (handleNotificationAlert) {
              handleNotificationAlert(syntheticEvent);
            }
          } catch (error) {
            console.error('🔔 [WSBoot] Error handling RTS alert:', error);
          }
        };

        // Listen for detailed WebSocket events
        window.addEventListener('pmt-widget-data', handleNotificationAlert);
        window.addEventListener('pmt-rts', handleRtsAlert);

        // Connect to WebSocket to ensure we receive events (shared connection)
        await widgetDataWebSocket.connect();
        
        console.log('✅ [WSBoot] Notification WebSocket listener established');
      } catch (error) {
        console.error('❌ [WSBoot] Failed to setup notification WebSocket listener:', error);
      }
    };

    // Setup notification WebSocket with a small delay
    const notificationTimeoutId = setTimeout(() => {
      setupNotificationWebSocket();
    }, 100);

    return () => { 
       
      console.log('🔌 [WSBoot] Cleaning up WebSocket connections...');
      
      clearTimeout(notificationTimeoutId);
      
      // Remove event listeners
      if (handleNotificationAlert) {
        window.removeEventListener('pmt-widget-data', handleNotificationAlert);
      }
      if (handleRtsAlert) {
        window.removeEventListener('pmt-rts', handleRtsAlert);
      }
      
      widgetDataWebSocket.disconnect();
      // tradingViewWebSocket.disconnect(); // Disabled
    };
  }, []);
  
  return null;
}


