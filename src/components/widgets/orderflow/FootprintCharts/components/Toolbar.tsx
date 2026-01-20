/**
 * @file Toolbar.tsx
 * @description Toolbar component for Footprint Charts widget
 */

'use client';

import React from 'react';
import { useFootprintStore } from '../state/footprintStore';
import { ChartType, Timeframe, DrawingTool, INSTRUMENTS } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  MousePointer,
  TrendingUp,
  Minus,
  PenTool,
  Flame,
  BarChart3,
  CandlestickChart,
  GitBranch,
  Settings2
} from 'lucide-react';

interface ToolbarProps {
  connectionStatus: string;
}

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: 1, label: '1m' },
  { value: 5, label: '5m' },
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 60, label: '1h' }
];

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'bid_ask', label: 'Bid x Ask' },
  { value: 'volume', label: 'Volume' },
  { value: 'delta', label: 'Delta' },
  { value: 'dots', label: 'Volume Dots' }
];

const TICK_MULTIPLIERS = [1, 2, 5, 10];

const DRAWING_TOOLS: { value: DrawingTool; label: string; icon: React.ReactNode }[] = [
  { value: 'cursor', label: 'Select', icon: <MousePointer className="w-4 h-4" /> },
  { value: 'trendline', label: 'Trendline', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'horizontal', label: 'Horizontal', icon: <Minus className="w-4 h-4" /> },
  { value: 'ray', label: 'Ray', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'fib', label: 'Fibonacci', icon: <GitBranch className="w-4 h-4" /> },
  { value: 'pen', label: 'Pen', icon: <PenTool className="w-4 h-4" /> }
];

export const Toolbar: React.FC<ToolbarProps> = ({ connectionStatus }) => {
  const {
    state,
    setInstrument,
    setChartType,
    setTimeframe,
    setTickMultiplier,
    toggleHeatmap,
    toggleCandlesticks,
    toggleDOM,
    setActiveTool,
    setSettingsPanelOpen
  } = useFootprintStore();

  const {
    instrument,
    chartType,
    timeframe,
    tickMultiplier,
    showHeatmap,
    showCandlesticks,
    showDOM,
    activeTool,
    settingsPanelOpen
  } = state;

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border-primary,#2a2e39)] bg-[var(--color-background-secondary,#1e222d)]">
      {/* Instrument Selector */}
      <Select value={instrument} onValueChange={setInstrument}>
        <SelectTrigger className="w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {INSTRUMENTS.map((inst) => (
            <SelectItem key={inst} value={inst}>
              {inst}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Timeframe Selector */}
      <Select value={timeframe.toString()} onValueChange={(v) => setTimeframe(Number(v) as Timeframe)}>
        <SelectTrigger className="w-16 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIMEFRAMES.map((tf) => (
            <SelectItem key={tf.value} value={tf.value.toString()}>
              {tf.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Chart Type Selector */}
      <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
        <SelectTrigger className="w-28 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CHART_TYPES.map((ct) => (
            <SelectItem key={ct.value} value={ct.value}>
              {ct.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tick Multiplier */}
      <Select value={tickMultiplier.toString()} onValueChange={(v) => setTickMultiplier(Number(v))}>
        <SelectTrigger className="w-16 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TICK_MULTIPLIERS.map((tm) => (
            <SelectItem key={tm} value={tm.toString()}>
              {tm}x
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-6" />

      {/* Toggle Buttons */}
      <Button
        variant={showHeatmap ? 'default' : 'ghost'}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={toggleHeatmap}
        title="Heatmap"
      >
        <Flame className="w-4 h-4" />
      </Button>

      <Button
        variant={showCandlesticks ? 'default' : 'ghost'}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={toggleCandlesticks}
        title="Candlesticks"
      >
        <CandlestickChart className="w-4 h-4" />
      </Button>

      <Button
        variant={showDOM ? 'default' : 'ghost'}
        size="sm"
        className="h-8 w-8 p-0"
        onClick={toggleDOM}
        title="DOM"
      >
        <BarChart3 className="w-4 h-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Drawing Tools */}
      {DRAWING_TOOLS.map((tool) => (
        <Button
          key={tool.value}
          variant={activeTool === tool.value ? 'default' : 'ghost'}
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setActiveTool(tool.value)}
          title={tool.label}
        >
          {tool.icon}
        </Button>
      ))}

      <div className="flex-1" />

      {/* Connection Status */}
      <div className="flex items-center gap-2 text-xs">
        <div
          className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected'
              ? 'bg-green-500'
              : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
              ? 'bg-yellow-500'
              : 'bg-red-500'
          }`}
        />
        <span className="text-[var(--color-text-secondary,#868d98)]">
          {connectionStatus}
        </span>
      </div>

      {/* Settings Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => setSettingsPanelOpen(!settingsPanelOpen)}
      >
        <Settings2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default Toolbar;
