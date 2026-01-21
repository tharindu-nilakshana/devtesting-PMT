'use client';

/**
 * TickerSettings Component
 *
 * Settings panel for SingleTicker widget.
 * Allows selection of asset class, symbol, and layout.
 */

import { useState, useEffect } from 'react';
import { Settings2, ChevronDown } from 'lucide-react';
import { useSymbols, SymbolData } from './useSymbols';
import { EMOJI_MAP, LayoutType } from './types';

interface TickerSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPair: string;
  selectedModule: string;
  selectedLayout: LayoutType;
  onPairChange: (pair: string, module?: string) => void;
  onModuleChange: (module: string) => void;
  onLayoutChange: (layout: LayoutType) => void;
}

const PRICE_LAYOUTS = [
  { value: 'below' as const, label: 'Below Symbol' },
  { value: 'right' as const, label: 'Right Side' },
];

/**
 * Get flag emoji for a currency
 */
function getFlag(base: string): string {
  return EMOJI_MAP[base] || base.substring(0, 2);
}

export function TickerSettings({
  isOpen,
  onClose,
  selectedPair,
  selectedModule: initialModule,
  selectedLayout,
  onPairChange,
  onModuleChange,
  onLayoutChange,
}: TickerSettingsProps) {
  const [currentModule, setCurrentModule] = useState<string>(initialModule || '');
  const [isModuleDropdownOpen, setIsModuleDropdownOpen] = useState(false);
  const [isPairDropdownOpen, setIsPairDropdownOpen] = useState(false);
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);

  // Fetch symbols from API
  const { symbols, symbolsByModule, modules, isLoading } = useSymbols({
    enabled: isOpen,
  });

  // Sync with parent's module when it changes
  useEffect(() => {
    if (initialModule && initialModule !== currentModule) {
      setCurrentModule(initialModule);
    }
  }, [initialModule, currentModule]);

  // Set default module when modules are loaded
  useEffect(() => {
    if (modules.length > 0 && !currentModule) {
      const defaultModule = modules[0];
      setCurrentModule(defaultModule);
      onModuleChange(defaultModule);
    }
  }, [modules, currentModule, onModuleChange]);

  if (!isOpen) return null;

  const filteredSymbols: SymbolData[] = currentModule
    ? (symbolsByModule[currentModule] || [])
    : symbols;
  const selectedSymbolData = filteredSymbols.find(s => s.symbol === selectedPair) || filteredSymbols[0];
  const selectedLayoutData = PRICE_LAYOUTS.find(l => l.value === selectedLayout) || PRICE_LAYOUTS[0];

  return (
    <div className="absolute inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Settings Panel */}
      <div className="w-80 bg-widget-body border-l border-border flex flex-col animate-slide-in-from-right">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary" />
            <span className="text-foreground font-bold">Settings</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-visible p-4 space-y-6">
          {/* Module/Asset Class */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block font-bold">
              Asset Class
            </label>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModuleDropdownOpen(!isModuleDropdownOpen);
                  setIsPairDropdownOpen(false);
                  setIsLayoutDropdownOpen(false);
                }}
                disabled={isLoading}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded text-sm transition-colors bg-widget-header border border-border text-foreground hover:border-muted-foreground disabled:opacity-50"
              >
                <span className="font-bold">
                  {isLoading ? 'Loading...' : (currentModule || 'Select')}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isModuleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isModuleDropdownOpen && modules.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg z-[100] overflow-hidden max-h-60 overflow-y-auto bg-widget-body border border-border">
                  {modules.map((mod) => (
                    <button
                      key={mod}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentModule(mod);
                        onModuleChange(mod);
                        // Select first symbol of new module
                        const newSymbols = symbolsByModule[mod];
                        if (newSymbols && newSymbols.length > 0) {
                          onPairChange(newSymbols[0].symbol, mod);
                        }
                        setIsModuleDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                        currentModule === mod
                          ? 'bg-primary/20 text-primary'
                          : 'text-foreground hover:bg-primary/20 focus:bg-primary/20 focus:text-primary'
                      }`}
                    >
                      <span className="font-bold">{mod}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Symbol/Pair */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block font-bold">
              Symbol
            </label>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPairDropdownOpen(!isPairDropdownOpen);
                  setIsModuleDropdownOpen(false);
                  setIsLayoutDropdownOpen(false);
                }}
                disabled={isLoading || filteredSymbols.length === 0}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded text-sm transition-colors bg-widget-header border border-border text-foreground hover:border-muted-foreground disabled:opacity-50"
              >
                <span className="flex items-center gap-2 font-bold">
                  <span>{getFlag(selectedSymbolData?.base || '')}</span>
                  <span>{selectedSymbolData?.symbol || selectedPair || 'Select'}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isPairDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPairDropdownOpen && filteredSymbols.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg z-[100] overflow-hidden max-h-60 overflow-y-auto bg-widget-body border border-border scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/50">
                  {filteredSymbols.map((symbol) => (
                    <button
                      key={symbol.symbol}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPairChange(symbol.symbol, symbol.module);
                        setIsPairDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                        selectedPair === symbol.symbol
                          ? 'bg-primary/20 text-primary'
                          : 'text-foreground hover:bg-widget-header'
                      }`}
                    >
                      <span className="flex items-center gap-2 font-bold">
                        <span>{getFlag(symbol.base || '')}</span>
                        <span>{symbol.symbol}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Price Layout */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block font-bold">
              Price Layout
            </label>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLayoutDropdownOpen(!isLayoutDropdownOpen);
                  setIsModuleDropdownOpen(false);
                  setIsPairDropdownOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded text-sm transition-colors bg-widget-header border border-border text-foreground hover:border-muted-foreground"
              >
                <span className="font-bold">{selectedLayoutData.label}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isLayoutDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isLayoutDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded shadow-lg z-[100] overflow-hidden bg-widget-body border border-border">
                  {PRICE_LAYOUTS.map((layout) => (
                    <button
                      key={layout.value}
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayoutChange(layout.value);
                        setIsLayoutDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                        selectedLayout === layout.value
                          ? 'bg-primary/20 text-primary'
                          : 'text-foreground hover:bg-primary/20 focus:bg-primary/20 focus:text-primary'
                      }`}
                    >
                      <span className="font-bold">{layout.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TickerSettings;
