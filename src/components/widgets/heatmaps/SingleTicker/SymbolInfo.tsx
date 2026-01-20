'use client';

/**
 * SymbolInfo Component
 *
 * Displays the trading symbol with its currency icon/emoji.
 */

import { getCurrencyEmoji } from './types';

interface SymbolInfoProps {
  symbol: string;
  description: string;
  baseCurrency: string;
}

export function SymbolInfo({ symbol, baseCurrency }: SymbolInfoProps) {
  const emoji = getCurrencyEmoji(baseCurrency);

  return (
    <div className="flex items-center gap-4 mb-8">
      {/* Icon circle with currency emoji */}
      <div className="w-16 h-16 rounded-full border-2 border-primary/30 bg-primary/5 flex items-center justify-center">
        <span className="text-3xl">{emoji}</span>
      </div>

      {/* Symbol name */}
      <div className="text-2xl text-foreground tracking-wide font-bold">
        {symbol}
      </div>
    </div>
  );
}

export default SymbolInfo;
