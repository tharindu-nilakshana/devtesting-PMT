'use client';

import { TimeRangePreset, TIME_RANGE_PRESETS } from '@/types/bond';

interface HeaderProps {
  selectedRange: TimeRangePreset;
  onRangeChange: (range: TimeRangePreset) => void;
  change?: number;
  roc?: number;
  displayMode?: string;
}

export function Header({
  selectedRange,
  onRangeChange,
  change,
  roc,
  displayMode = 'yield',
}: HeaderProps) {
  const formatValue = (value: number | undefined, isYield: boolean = true) => {
    if (value === undefined) return '--';
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toFixed(2)}${isYield ? '%' : ''}`;
  };

  const getValueColor = (value: number | undefined) => {
    if (value === undefined) return 'text-muted-foreground';
    return value >= 0 ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div className="px-2 sm:px-3 py-2 border-b border-border bg-widget-header">
      {/* Responsive: Stack on very small screens, side by side on larger */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 sm:justify-between">
        {/* Time Range Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {TIME_RANGE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onRangeChange(preset.value)}
              className={`px-2 py-1 text-xs rounded transition-colors font-bold ${
                selectedRange === preset.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-bold">Change:</span>
            <span className={`font-bold ${getValueColor(change)}`}>
              {formatValue(change, displayMode === 'yield')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-bold">RoC:</span>
            <span className={`font-bold ${getValueColor(roc)}`}>
              {formatValue(roc, true)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;
