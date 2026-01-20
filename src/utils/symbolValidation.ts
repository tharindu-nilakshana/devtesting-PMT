/**
 * Symbol validation utilities for template names
 */

interface SymbolData {
  Symbol: string;
  SymbolID: number;
  NameToDisplay: string;
  Module: string;
}

/**
 * Fetch all symbols from the get-symbols API
 */
export async function fetchAllSymbols(): Promise<string[]> {
  try {
    const modules = ['Forex', 'US Stocks', 'Commodities', 'Indices'];
    const allSymbols: string[] = [];

    for (const moduleName of modules) {
      try {
        const response = await fetch('/api/pmt/get-symbols', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Module: moduleName }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && Array.isArray(data.data)) {
            const moduleSymbols = data.data.map((item: SymbolData) => 
              item.Symbol?.toUpperCase() || ''
            ).filter(Boolean);
            allSymbols.push(...moduleSymbols);
          }
        }
      } catch (error) {
        console.error(`Error fetching symbols for module ${moduleName}:`, error);
      }
    }

    return [...new Set(allSymbols)];
  } catch (error) {
    console.error('Error fetching symbols:', error);
    return [];
  }
}

/**
 * Check if a template name is similar to a symbol
 */
export function isTemplateNameSimilarToSymbol(templateName: string, symbolsList: string[]): boolean {
  const normalizedTemplateName = templateName.toUpperCase().trim();
  
  // Helper function to strip exchange prefix from US Stocks (e.g., "NASDAQ:AAPL" -> "AAPL")
  const stripExchangePrefix = (sym: string): string => {
    const parts = sym.split(':');
    return parts.length > 1 ? parts[1] : sym;
  };
  
  // Strip exchange prefix from template name
  const templateNameWithoutExchange = stripExchangePrefix(normalizedTemplateName);
  
  // Direct match
  if (symbolsList.includes(normalizedTemplateName)) {
    return true;
  }
  
  // Check if template name contains or is contained by any symbol
  for (const symbol of symbolsList) {
    const normalizedSymbol = symbol.toUpperCase();
    const symbolWithoutExchange = stripExchangePrefix(normalizedSymbol);
    
    // Check if template name exactly matches symbol (with or without exchange prefix)
    if (normalizedTemplateName === normalizedSymbol || 
        templateNameWithoutExchange === symbolWithoutExchange) {
      return true;
    }
    
    // Check if template name is a symbol with common suffixes/prefixes removed
    const cleanedTemplateName = normalizedTemplateName
      .replace(/^(TEMPLATE|TPL|LAYOUT)[-_\s]*/i, '')
      .replace(/[-_\s]*(TEMPLATE|TPL|LAYOUT)$/i, '');
    
    if (cleanedTemplateName === normalizedSymbol || 
        stripExchangePrefix(cleanedTemplateName) === symbolWithoutExchange) {
      return true;
    }
  }
  
  return false;
}

// Cache for symbols to avoid repeated API calls
let symbolsCache: string[] | null = null;
let symbolsCacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get symbols with caching
 */
export async function getCachedSymbols(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached symbols if they're still fresh
  if (symbolsCache && symbolsCacheTimestamp && (now - symbolsCacheTimestamp) < CACHE_DURATION) {
    return symbolsCache;
  }
  
  // Fetch new symbols
  symbolsCache = await fetchAllSymbols();
  symbolsCacheTimestamp = now;
  
  return symbolsCache;
}

/**
 * Clear the symbols cache (useful for testing or forced refresh)
 */
export function clearSymbolsCache(): void {
  symbolsCache = null;
  symbolsCacheTimestamp = null;
}
