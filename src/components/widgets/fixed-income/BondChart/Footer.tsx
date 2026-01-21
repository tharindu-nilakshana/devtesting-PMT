'use client';

interface FooterProps {
  current?: number;
  high?: number;
  low?: number;
  lastUpdated?: Date | null;
  displayMode?: string;
}

export function Footer({
  current,
  high,
  low,
  lastUpdated,
  displayMode = 'yield',
}: FooterProps) {
  const formatValue = (value: number | undefined) => {
    if (value === undefined) return '--';
    const suffix = displayMode === 'yield' ? '%' : '';
    return `${value.toFixed(2)}${suffix}`;
  };

  const formatTime = (date: Date | null | undefined) => {
    if (!date) return '--';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="px-2 sm:px-4 py-2 border-t border-border bg-widget-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0 text-xs">
      {/* Stats Row */}
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground font-bold">Current:</span>
          <span className="text-foreground font-bold">{formatValue(current)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground font-bold">High:</span>
          <span className="text-foreground font-bold">{formatValue(high)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground font-bold">Low:</span>
          <span className="text-foreground font-bold">{formatValue(low)}</span>
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-1 text-muted-foreground">
        <span className="font-bold hidden sm:inline">Updated:</span>
        <span className="font-bold">{formatTime(lastUpdated)}</span>
      </div>
    </div>
  );
}

export default Footer;
