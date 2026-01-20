/**
 * @file index.tsx
 * @description Main entry point for the Footprint Charts widget
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { FootprintChart } from './components/FootprintChart';
import { Toolbar } from './components/Toolbar';
import { SettingsPanel } from './components/SettingsPanel';
import { WebSocketService } from './services/WebSocketService';
import { IndexedDBService } from './services/IndexedDBService';
import { FootprintProvider, useFootprintStore } from './state/footprintStore';
import { Trade, FootprintChartsProps, ConnectionStatus, INSTRUMENTS } from './types';

// Sample data for initial demo (when no live connection)
const SAMPLE_TRADES: Trade[] = [
  { orderflow_id: 1, symbol: '@EU#', datetime: '2025-12-22 14:26:44', price: 1.1585, trade_condition: 1, trade_size: 5 },
  { orderflow_id: 2, symbol: '@EU#', datetime: '2025-12-22 14:26:45', price: 1.1586, trade_condition: 1, trade_size: 10 },
  { orderflow_id: 3, symbol: '@EU#', datetime: '2025-12-22 14:26:46', price: 1.1584, trade_condition: 2, trade_size: 8 },
  { orderflow_id: 4, symbol: '@EU#', datetime: '2025-12-22 14:26:47', price: 1.1585, trade_condition: 1, trade_size: 15 },
  { orderflow_id: 5, symbol: '@EU#', datetime: '2025-12-22 14:26:48', price: 1.1583, trade_condition: 2, trade_size: 12 },
  { orderflow_id: 6, symbol: '@EU#', datetime: '2025-12-22 14:27:00', price: 1.1586, trade_condition: 1, trade_size: 20 },
  { orderflow_id: 7, symbol: '@EU#', datetime: '2025-12-22 14:27:10', price: 1.1587, trade_condition: 1, trade_size: 25 },
  { orderflow_id: 8, symbol: '@EU#', datetime: '2025-12-22 14:27:20', price: 1.1585, trade_condition: 2, trade_size: 18 },
  { orderflow_id: 9, symbol: '@EU#', datetime: '2025-12-22 14:27:30', price: 1.1584, trade_condition: 2, trade_size: 22 },
  { orderflow_id: 10, symbol: '@EU#', datetime: '2025-12-22 14:27:40', price: 1.1586, trade_condition: 1, trade_size: 30 },
  // Add more sample data to make the demo useful
  ...generateSampleTrades(),
];

// Generate more sample trades for demo
function generateSampleTrades(): Trade[] {
  const trades: Trade[] = [];
  const baseTime = new Date('2025-12-22T14:28:00').getTime();
  let price = 1.1585;
  
  for (let i = 0; i < 500; i++) {
    const direction = Math.random() > 0.5 ? 1 : -1;
    price += direction * 0.0001 * (Math.random() * 2);
    price = Math.round(price * 10000) / 10000;
    
    trades.push({
      orderflow_id: 100 + i,
      symbol: '@EU#',
      datetime: new Date(baseTime + i * 1000).toISOString().replace('T', ' ').slice(0, 19),
      price: price,
      trade_condition: Math.random() > 0.5 ? 1 : 2,
      trade_size: Math.floor(Math.random() * 50) + 1,
    });
  }
  
  return trades;
}

// Inner component that uses the store
function FootprintChartsInner({
  onSettings,
  onRemove,
  onFullscreen,
}: FootprintChartsProps) {
  const [trades, setTrades] = useState<Trade[]>(SAMPLE_TRADES);
  const [dbService, setDbService] = useState<IndexedDBService | null>(null);
  
  const { state, setConnectionStatus, restoreDrawings } = useFootprintStore();
  const { connectionStatus, drawings } = state;

  // Handle new trades from WebSocket
  const handleNewTrades = useCallback((newTrades: Trade[]) => {
    setTrades((prev) => {
      const combined = [...prev, ...newTrades];
      // Limit to prevent memory issues
      const MAX_TRADES = 50000;
      return combined.length > MAX_TRADES ? combined.slice(-MAX_TRADES) : combined;
    });
  }, []);

  // Handle connection status changes
  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
  }, [setConnectionStatus]);

  // Initialize WebSocket service
  useEffect(() => {
    const ws = new WebSocketService(handleNewTrades, handleStatusChange, {
      symbols: INSTRUMENTS,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      bufferFlushInterval: 200,
    });

    ws.connect();

    return () => {
      ws.disconnect();
    };
  }, [handleNewTrades, handleStatusChange]);

  // Initialize IndexedDB service for drawing persistence
  useEffect(() => {
    if (!IndexedDBService.isAvailable()) return;

    const db = new IndexedDBService('footprint-charts');
    setDbService(db);

    // Load saved drawings
    db.init()
      .then(() => db.loadDrawings())
      .then((savedDrawings) => {
        if (savedDrawings.length > 0) {
          restoreDrawings(savedDrawings);
        }
      })
      .catch((err) => {
        console.error('[FootprintCharts] Failed to load drawings:', err);
      });

    return () => {
      db.close();
    };
  }, [restoreDrawings]);

  // Save drawings to IndexedDB when they change
  useEffect(() => {
    if (!dbService) return;
    
    const saveTimeout = setTimeout(() => {
      dbService.saveDrawings(drawings).catch((err) => {
        console.error('[FootprintCharts] Failed to save drawings:', err);
      });
    }, 500); // Debounce saves

    return () => clearTimeout(saveTimeout);
  }, [drawings, dbService]);

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-background-primary,#131722)]">
      {/* Widget Header */}
      <WidgetHeader
        title="Footprint Charts"
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
      />

      {/* Toolbar */}
      <Toolbar connectionStatus={connectionStatus} />

      {/* Chart Container */}
      <div className="flex-1 relative overflow-hidden">
        <FootprintChart data={trades} />
        <SettingsPanel />
      </div>
    </div>
  );
}

// Main export with provider wrapper
export function FootprintChartsWidget(props: FootprintChartsProps) {
  return (
    <FootprintProvider>
      <FootprintChartsInner {...props} />
    </FootprintProvider>
  );
}

export default FootprintChartsWidget;
