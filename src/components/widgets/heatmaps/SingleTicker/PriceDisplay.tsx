'use client';

/**
 * PriceDisplay Component
 *
 * Displays the current price with change amount and percentage.
 * Used in the "below" layout mode.
 */

interface PriceDisplayProps {
  price: number;
  change: number;
  changePercent: number;
  decimalPlaces?: number;
  showBorder?: boolean;
}

export function PriceDisplay({
  price,
  change,
  changePercent,
  decimalPlaces = 5,
  showBorder = false,
}: PriceDisplayProps) {
  const isPositive = change >= 0;

  const formattedPrice = price.toFixed(decimalPlaces);
  const absChange = Math.abs(change);
  const formattedChange = (isPositive ? '+' : '-') + absChange.toFixed(decimalPlaces);
  const formattedPercent = Math.abs(changePercent).toFixed(2);

  return (
    <div className="mt-auto space-y-4">
      {/* Large price with border accent */}
      <div className="border-l-4 border-primary pl-4">
        <div
          className={`text-6xl text-foreground tracking-tight font-bold transition-all duration-300 ${
            showBorder ? 'scale-105' : 'scale-100'
          }`}
        >
          {formattedPrice}
        </div>
      </div>

      {/* Change information */}
      <div className="flex items-center gap-4 pl-4">
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

        {/* Price Difference */}
        <div className={`text-sm font-bold ${isPositive ? 'text-green-500/70' : 'text-red-500/70'}`}>
          {formattedChange}
        </div>
      </div>
    </div>
  );
}

export default PriceDisplay;
