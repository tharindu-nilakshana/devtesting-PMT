/**
 * @file SettingsPanel.tsx
 * @description Settings panel for Footprint Charts widget
 */

'use client';

import React from 'react';
import { useFootprintStore } from '../state/footprintStore';
import { Theme } from '../types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { X, Trash2 } from 'lucide-react';

export const SettingsPanel: React.FC = () => {
  const {
    state,
    setSettingsPanelOpen,
    togglePOC,
    toggleValueArea,
    toggleImbalances,
    toggleHeatmap,
    toggleCandlesticks,
    toggleDOM,
    clearAllDrawings,
    setTheme
  } = useFootprintStore();

  const {
    settingsPanelOpen: isOpen,
    showPOC,
    showValueArea,
    showImbalances,
    showHeatmap,
    showCandlesticks,
    showDOM,
    drawings,
    themes,
    activeThemeId
  } = state;

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 h-full w-72 bg-[var(--color-background-secondary,#1e222d)] border-l border-[var(--color-border-primary,#2a2e39)] shadow-xl z-20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-primary,#2a2e39)]">
        <h3 className="text-sm font-medium text-[var(--color-text-primary,#d1d4dc)]">Settings</h3>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSettingsPanelOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Display Options */}
        <div className="space-y-4">
          <h4 className="text-xs font-medium text-[var(--color-text-secondary,#868d98)] uppercase tracking-wider">
            Display
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-poc" className="text-sm">Point of Control</Label>
              <Switch id="show-poc" checked={showPOC} onCheckedChange={togglePOC} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-va" className="text-sm">Value Area</Label>
              <Switch id="show-va" checked={showValueArea} onCheckedChange={toggleValueArea} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-imbalances" className="text-sm">Imbalances</Label>
              <Switch id="show-imbalances" checked={showImbalances} onCheckedChange={toggleImbalances} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-heatmap" className="text-sm">Heatmap</Label>
              <Switch id="show-heatmap" checked={showHeatmap} onCheckedChange={toggleHeatmap} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-candles" className="text-sm">Candlesticks</Label>
              <Switch id="show-candles" checked={showCandlesticks} onCheckedChange={toggleCandlesticks} />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-dom" className="text-sm">DOM Panel</Label>
              <Switch id="show-dom" checked={showDOM} onCheckedChange={toggleDOM} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Theme Selection */}
        <div className="space-y-4">
          <h4 className="text-xs font-medium text-[var(--color-text-secondary,#868d98)] uppercase tracking-wider">
            Theme
          </h4>
          
          <div className="grid grid-cols-2 gap-2">
            {themes.map((theme: Theme) => (
              <button
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className={`p-3 rounded-md border transition-colors ${
                  activeThemeId === theme.id
                    ? 'border-[var(--color-accent,#2962ff)] bg-[var(--color-background-hover,#2a2e39)]'
                    : 'border-[var(--color-border-primary,#2a2e39)] hover:bg-[var(--color-background-hover,#2a2e39)]'
                }`}
              >
                <div
                  className="w-full h-8 rounded mb-2"
                  style={{ backgroundColor: theme.colors.backgroundPrimary }}
                >
                  <div className="flex h-full items-center justify-center gap-1">
                    <div className="w-2 h-4 rounded-sm" style={{ backgroundColor: theme.colors.up }} />
                    <div className="w-2 h-4 rounded-sm" style={{ backgroundColor: theme.colors.down }} />
                  </div>
                </div>
                <span className="text-xs text-[var(--color-text-primary,#d1d4dc)]">{theme.name}</span>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Drawings */}
        <div className="space-y-4">
          <h4 className="text-xs font-medium text-[var(--color-text-secondary,#868d98)] uppercase tracking-wider">
            Drawings
          </h4>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-primary,#d1d4dc)]">
              {drawings.length} drawing{drawings.length !== 1 ? 's' : ''}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={clearAllDrawings}
              disabled={drawings.length === 0}
              className="h-8"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </div>
        </div>

        <Separator />

        {/* Keyboard Shortcuts */}
        <div className="space-y-4">
          <h4 className="text-xs font-medium text-[var(--color-text-secondary,#868d98)] uppercase tracking-wider">
            Shortcuts
          </h4>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary,#868d98)]">Horizontal Zoom</span>
              <span className="text-[var(--color-text-primary,#d1d4dc)]">Ctrl + Scroll</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary,#868d98)]">Horizontal Pan</span>
              <span className="text-[var(--color-text-primary,#d1d4dc)]">Shift + Scroll</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary,#868d98)]">Vertical Zoom</span>
              <span className="text-[var(--color-text-primary,#d1d4dc)]">Alt + Scroll</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary,#868d98)]">Vertical Pan</span>
              <span className="text-[var(--color-text-primary,#d1d4dc)]">Scroll</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary,#868d98)]">Delete Drawing</span>
              <span className="text-[var(--color-text-primary,#d1d4dc)]">Delete</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary,#868d98)]">Cancel</span>
              <span className="text-[var(--color-text-primary,#d1d4dc)]">Escape</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
