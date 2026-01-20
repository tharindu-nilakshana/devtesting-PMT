'use client';

/**
 * useSymbols Hook
 *
 * Fetches available trading symbols from the API.
 * Organizes symbols by module/asset class for easy selection.
 */

import { useState, useEffect, useCallback } from 'react';

export interface SymbolData {
  symbol: string;
  name: string;
  module: string;
  base?: string;
}

interface UseSymbolsOptions {
  module?: string;
  enabled?: boolean;
}

interface UseSymbolsReturn {
  symbols: SymbolData[];
  symbolsByModule: Record<string, SymbolData[]>;
  modules: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Extract base currency from symbol
 */
function extractBase(symbol: string): string {
  if (!symbol) return '';
  if (symbol.startsWith('XAU')) return 'XAU';
  if (symbol.startsWith('XAG')) return 'XAG';
  if (symbol.startsWith('XBR')) return 'XBR';
  if (symbol.startsWith('XTI')) return 'XTI';
  if (symbol.startsWith('BTC')) return 'BTC';
  if (symbol.startsWith('ETH')) return 'ETH';
  if (symbol.length >= 6) return symbol.substring(0, 3);
  return symbol.substring(0, 3);
}

export function useSymbols({
  module,
  enabled = true,
}: UseSymbolsOptions = {}): UseSymbolsReturn {
  const [symbols, setSymbols] = useState<SymbolData[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSymbols = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const body: Record<string, string> = {};
      if (module) {
        body.Module = module;
      }

      const response = await fetch('/api/heatmaps/singletickersymbols', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch symbols');
      }

      const data = await response.json();

      // Handle different response formats
      let symbolsList: SymbolData[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rawData: any[] = [];

      if (Array.isArray(data)) {
        rawData = data;
      } else if (data.data && Array.isArray(data.data)) {
        rawData = data.data;
      } else if (data.symbols && Array.isArray(data.symbols)) {
        rawData = data.symbols;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      symbolsList = rawData.map((item: any) => ({
        symbol: item.Symbol || item.symbol || '',
        name: item.Name || item.name || item.Symbol || item.symbol || '',
        module: item.Module || item.module || item.AssetClass || item.assetClass || 'Forex',
        base: extractBase(item.Symbol || item.symbol || ''),
      })).filter((s: SymbolData) => s.symbol);

      setSymbols(symbolsList);

      // Extract unique modules
      const uniqueModules = [...new Set(symbolsList.map(s => s.module))].filter(Boolean).sort();
      setModules(uniqueModules);

    } catch (err) {
      console.error('[useSymbols] Error fetching symbols:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch symbols'));
    } finally {
      setIsLoading(false);
    }
  }, [module, enabled]);

  useEffect(() => {
    fetchSymbols();
  }, [fetchSymbols]);

  // Organize symbols by module
  const symbolsByModule = symbols.reduce<Record<string, SymbolData[]>>((acc, symbol) => {
    const mod = symbol.module || 'Unknown';
    if (!acc[mod]) {
      acc[mod] = [];
    }
    acc[mod].push(symbol);
    return acc;
  }, {});

  return {
    symbols,
    symbolsByModule,
    modules,
    isLoading,
    error,
    refetch: fetchSymbols,
  };
}

export default useSymbols;
