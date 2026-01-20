'use client';

/**
 * RightSideLayout Component
 *
 * Alternative layout with symbol info on left and price on right.
 * Used in the "right" layout mode.
 */

import { getCurrencyEmoji } from './types';

interface RightSideLayoutProps {
  symbol: string;
  description: string;
  baseCurrency: string;
  price: number;
  change: number;
  changePercent: number;
  showBorder?: boolean;
}

const DECIMAL_PLACES = 5;

export function RightSideLayout({
  symbol,
  baseCurrency,
  price,
  change,
  changePercent,
  showBorder = false,
}: RightSideLayoutProps) {
  const isPositive = change >= 0;
  const emoji = getCurrencyEmoji(baseCurrency);

  const formattedPrice = price.toFixed(DECIMAL_PLACES);
  const absChange = Math.abs(change);
  const formattedChange = (isPositive ? '+' : '-') + absChange.toFixed(DECIMAL_PLACES);
  const formattedPercent = Math.abs(changePercent).toFixed(2);

  return (
    <div className="flex-1 flex items-center justify-between gap-8">
      {/* Left: Icon and name */}
      <div className="flex items-center gap-4">
        {/* Icon circle with currency emoji */}
        <div className="w-20 h-20 rounded-full border-2 border-primary/30 bg-primary/5 flex items-center justify-center">
          <span className="text-4xl">{emoji}</span>
        </div>

        {/* Symbol name */}
        <div className="text-3xl text-foreground tracking-wide font-bold">
          {symbol}
        </div>
      </div>

      {/* Right: Price section */}
      <div className="space-y-4 text-right">
        {/* Large price with border accent */}
        <div className="border-r-4 border-primary pr-4">
          <div
            className={`text-6xl text-foreground tracking-tight font-bold transition-all duration-300 ${
              showBorder ? 'scale-105' : 'scale-100'
            }`}
          >
            {formattedPrice}
          </div>
        </div>

        {/* Change information */}
        <div className="flex items-center justify-end gap-4 pr-4">
          {/* Price Difference */}
          <div className={`text-sm font-bold ${isPositive ? 'text-green-500/70' : 'text-red-500/70'}`}>
            {formattedChange}
          </div>

          {/* Change Badge */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded border transition-all duration-300 ${
              isPositive
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-red-500/30 bg-red-500/10'
            } ${
              showBorder
                ? `ring-2 ring-offset-2 ring-offset-background ${
                    isPositive ? 'ring-green-500/50' : 'ring-red-500/50'
                  }`
                : ''
            }`}
          >
            <span className={`text-2xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '↑' : '↓'}
            </span>
            <span className={`text-xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {formattedPercent}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RightSideLayout;
