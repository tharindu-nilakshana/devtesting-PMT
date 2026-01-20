// Mini preview components for widget thumbnails

export function GenericWidgetPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex items-center justify-center">
      <div className="w-8 h-8 rounded bg-popover"></div>
    </div>
  );
}

export function COTPositioningPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex items-center justify-center">
      <svg className="w-full h-full" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="15" fill="none" stroke="#ff4d6d" strokeWidth="6" strokeDasharray="47 47" />
        <circle cx="20" cy="20" r="15" fill="none" stroke="#06d6a0" strokeWidth="6" strokeDasharray="47 47" strokeDashoffset="23.5" />
      </svg>
    </div>
  );
}

export function COTChartPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 40">
          <polyline points="5,35 15,30 25,25 35,20 45,18 55,15 65,12 75,10" fill="none" stroke="#06d6a0" strokeWidth="1" />
          <polyline points="5,30 15,28 25,32 35,28 45,30 55,25 65,28 75,25" fill="none" stroke="#ff4d6d" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}

export function ExponentialMovingAveragePreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 50">
          <polyline
            points="5,34 15,30 25,28 35,22 45,26 55,18 65,16 75,14"
            fill="none"
            stroke="#f97316"
            strokeWidth="1"
          />
          <polyline
            points="5,32 15,31 25,29 35,26 45,24 55,22 65,19 75,17"
            fill="none"
            stroke="#60a5fa"
            strokeWidth="0.9"
            opacity="0.85"
          />
        </svg>
      </div>
      <div className="flex gap-1 mt-0.5">
        <div className="flex-1 h-0.5 bg-orange-500/40 rounded"></div>
        <div className="flex-1 h-0.5 bg-blue-500/40 rounded"></div>
      </div>
    </div>
  );
}

export function SupertrendPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 50">
          <polyline
            points="5,36 15,32 25,28 35,30 45,24 55,26 65,18 75,20"
            fill="none"
            stroke="#f97316"
            strokeWidth="1"
          />
          <polyline
            points="5,26 15,24 25,22 35,20 45,18 55,16 65,14 75,12"
            fill="none"
            stroke="#22c55e"
            strokeWidth="0.9"
            opacity="0.85"
          />
          <polyline
            points="5,42 15,40 25,38 35,36 45,34 55,32 65,30 75,28"
            fill="none"
            stroke="#ef4444"
            strokeWidth="0.9"
            opacity="0.55"
            strokeDasharray="2,2"
          />
        </svg>
      </div>
      <div className="flex gap-1 mt-0.5">
        <div className="flex-1 h-0.5 bg-green-500/40 rounded"></div>
        <div className="flex-1 h-0.5 bg-red-500/40 rounded"></div>
      </div>
    </div>
  );
}

export function TechnicalChartsPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="h-2 bg-popover rounded-sm mb-1"></div>
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 40">
          <polyline
            points="5,28 15,26 25,22 35,18 45,20 55,16 65,12 75,14"
            fill="none"
            stroke="#f97316"
            strokeWidth="1"
          />
          <polyline
            points="5,30 15,29 25,27 35,25 45,24 55,22 65,20 75,18"
            fill="none"
            stroke="#22c55e"
            strokeWidth="0.6"
            opacity="0.7"
          />
          <polyline
            points="5,34 15,33 25,31 35,29 45,28 55,26 65,24 75,22"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="0.6"
            opacity="0.6"
          />
        </svg>
      </div>
      <div className="flex gap-0.5 mt-1">
        <div className="flex-1 h-0.5 bg-green-500/25 rounded"></div>
        <div className="flex-1 h-0.5 bg-blue-500/25 rounded"></div>
      </div>
    </div>
  );
}

export function PriceChartPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="h-2 bg-popover rounded-sm mb-1"></div>
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 40">
          <line x1="6" y1="6" x2="6" y2="34" stroke="#27272a" strokeWidth="0.6" />
          <line x1="6" y1="34" x2="76" y2="34" stroke="#27272a" strokeWidth="0.6" />
          {[
            { x: 14, o: 26, c: 22, h: 20, l: 28, up: true },
            { x: 24, o: 22, c: 24, h: 20, l: 26, up: true },
            { x: 34, o: 24, c: 19, h: 18, l: 26, up: false },
            { x: 44, o: 19, c: 16, h: 15, l: 22, up: false },
            { x: 54, o: 16, c: 18, h: 14, l: 20, up: true },
            { x: 64, o: 18, c: 14, h: 12, l: 22, up: false },
          ].map((b, i) => (
            <g key={i}>
              <line x1={b.x} y1={b.h} x2={b.x} y2={b.l} stroke={b.up ? '#22c55e' : '#ef4444'} strokeWidth="0.8" opacity="0.9" />
              <rect
                x={b.x - 2}
                y={Math.min(b.o, b.c)}
                width="4"
                height={Math.max(2, Math.abs(b.o - b.c))}
                fill={b.up ? '#22c55e' : '#ef4444'}
                opacity="0.35"
                stroke={b.up ? '#22c55e' : '#ef4444'}
                strokeWidth="0.6"
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function InformationChartPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="flex gap-1 mb-1">
        <div className="flex-1 h-2 bg-popover rounded-sm"></div>
        <div className="w-6 h-2 bg-popover/70 rounded-sm"></div>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-1">
        <div className="bg-popover/40 rounded-sm p-1 flex flex-col justify-between">
          <div className="h-1 bg-popover rounded-sm"></div>
          <div className="h-1 bg-primary/25 rounded-sm w-2/3"></div>
        </div>
        <div className="bg-popover/40 rounded-sm p-1 flex flex-col justify-between">
          <div className="h-1 bg-popover rounded-sm"></div>
          <div className="h-1 bg-success/20 rounded-sm w-1/2"></div>
        </div>
        <div className="bg-popover/25 rounded-sm p-1 flex items-end">
          <div className="w-full h-3 relative">
            <div className="absolute bottom-0 left-0 w-2 h-2 bg-primary/30 rounded-sm"></div>
            <div className="absolute bottom-0 left-3 w-2 h-3 bg-primary/20 rounded-sm"></div>
            <div className="absolute bottom-0 left-6 w-2 h-1.5 bg-primary/25 rounded-sm"></div>
            <div className="absolute bottom-0 left-9 w-2 h-2.5 bg-primary/20 rounded-sm"></div>
          </div>
        </div>
        <div className="bg-popover/25 rounded-sm p-1 flex items-center">
          <svg className="w-full h-full" viewBox="0 0 40 20">
            <polyline points="2,14 10,10 18,12 26,6 38,8" fill="none" stroke="#f97316" strokeWidth="1" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function SessionRangesPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 50">
          {/* Base price line */}
          <polyline
            points="5,30 15,34 25,28 35,32 45,24 55,26 65,20 75,22"
            fill="none"
            stroke="#f97316"
            strokeWidth="1"
          />
          {/* Session blocks */}
          <rect x="8" y="12" width="18" height="30" fill="#60a5fa" opacity="0.18" stroke="#60a5fa" strokeWidth="0.4" />
          <rect x="30" y="10" width="22" height="32" fill="#a78bfa" opacity="0.18" stroke="#a78bfa" strokeWidth="0.4" />
          <rect x="56" y="14" width="18" height="28" fill="#34d399" opacity="0.18" stroke="#34d399" strokeWidth="0.4" />
          {/* Open markers */}
          <circle cx="8" cy="30" r="1.5" fill="#60a5fa" />
          <circle cx="30" cy="32" r="1.5" fill="#a78bfa" />
          <circle cx="56" cy="26" r="1.5" fill="#34d399" />
        </svg>
      </div>
      <div className="flex gap-1 mt-0.5">
        <div className="flex-1 h-0.5 bg-blue-500/35 rounded"></div>
        <div className="flex-1 h-0.5 bg-purple-500/35 rounded"></div>
        <div className="flex-1 h-0.5 bg-emerald-500/35 rounded"></div>
      </div>
    </div>
  );
}

export function PercentMonthlyTargetsPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 50">
          {/* Grid */}
          <line x1="6" y1="10" x2="6" y2="44" stroke="#1f2937" strokeWidth="0.5" opacity="0.6" />
          <line x1="6" y1="44" x2="76" y2="44" stroke="#1f2937" strokeWidth="0.5" opacity="0.6" />
          {/* Target levels */}
          <line x1="10" y1="16" x2="74" y2="16" stroke="#22c55e" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.7" />
          <line x1="10" y1="28" x2="74" y2="28" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.7" />
          <line x1="10" y1="38" x2="74" y2="38" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.7" />
          {/* Progress bars */}
          <rect x="10" y="17.5" width="34" height="2" fill="#22c55e" opacity="0.25" />
          <rect x="10" y="29.5" width="22" height="2" fill="#f59e0b" opacity="0.25" />
          <rect x="10" y="39.5" width="14" height="2" fill="#ef4444" opacity="0.25" />
          {/* Marker */}
          <circle cx="52" cy="24" r="2" fill="#f97316" opacity="0.9" />
        </svg>
      </div>
      <div className="flex gap-1 mt-0.5">
        <div className="w-3 h-0.5 bg-green-500/40 rounded"></div>
        <div className="w-3 h-0.5 bg-amber-500/40 rounded"></div>
        <div className="w-3 h-0.5 bg-red-500/40 rounded"></div>
        <div className="flex-1" />
      </div>
    </div>
  );
}

export function QuarterMovementPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 50">
          {/* Candlestick chart */}
          <polyline
            points="5,38 15,32 25,28 35,30 45,24 55,26 65,18 75,20"
            fill="none"
            stroke="#f97316"
            strokeWidth="1"
          />
          {/* Q1 line */}
          <line x1="10" y1="36" x2="22" y2="30" stroke="#22c55e" strokeWidth="1.2" opacity="0.8" />
          {/* Q2 line */}
          <line x1="25" y1="28" x2="37" y2="26" stroke="#22c55e" strokeWidth="1.2" opacity="0.8" />
          {/* Q3 line */}
          <line x1="40" y1="25" x2="52" y2="22" stroke="#ef4444" strokeWidth="1.2" opacity="0.8" />
          {/* Q4 line */}
          <line x1="55" y1="24" x2="67" y2="18" stroke="#22c55e" strokeWidth="1.2" opacity="0.8" />
          {/* Quarter markers */}
          <circle cx="10" cy="36" r="1.5" fill="#22c55e" />
          <circle cx="25" cy="28" r="1.5" fill="#22c55e" />
          <circle cx="40" cy="25" r="1.5" fill="#ef4444" />
          <circle cx="55" cy="24" r="1.5" fill="#22c55e" />
        </svg>
      </div>
      <div className="flex gap-1 mt-0.5">
        <div className="flex-1 h-0.5 bg-green-500/40 rounded"></div>
        <div className="flex-1 h-0.5 bg-red-500/40 rounded"></div>
        <div className="flex-1 h-0.5 bg-green-500/40 rounded"></div>
      </div>
    </div>
  );
}

export function SeasonalityPreview() {
  return (
    <div className="w-full h-full bg-background p-0.5">
      <div className="grid grid-cols-4 grid-rows-3 gap-0.5 w-full h-full">
        {[...Array(12)].map((_, i) => {
          const intensity = Math.random();
          const isPositive = Math.random() > 0.5;
          const color = isPositive 
            ? `rgba(6, 214, 160, ${intensity * 0.6})` 
            : `rgba(253, 46, 100, ${intensity * 0.6})`;
          return <div key={i} style={{ backgroundColor: color }} className="rounded-[1px]"></div>;
        })}
      </div>
    </div>
  );
}

export function CurrencyStrengthPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 40">
          <polyline points="5,20 25,15 45,18 65,12 80,10" fill="none" stroke="#f97316" strokeWidth="1" />
          <polyline points="5,25 25,22 45,20 65,18 80,15" fill="none" stroke="#3b82f6" strokeWidth="1" />
          <polyline points="5,30 25,28 45,25 65,23 80,20" fill="none" stroke="#22c55e" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}

export function EconomicCalendarPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5">
      <div className="h-2 bg-popover rounded-sm"></div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex gap-0.5">
          <div className="w-4 h-1.5 bg-popover rounded-sm"></div>
          <div className="flex-1 h-1.5 bg-popover/60 rounded-sm"></div>
          <div className="w-6 h-1.5 bg-primary/20 rounded-sm"></div>
        </div>
      ))}
    </div>
  );
}

export function NewsTickerPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-0.5">
          <div className="w-1 h-2 bg-primary/30 rounded-sm"></div>
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="h-0.5 bg-popover rounded-sm"></div>
            <div className="h-0.5 bg-popover/50 rounded-sm w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NewsFeedPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-0.5">
          <div className="w-1 h-2 bg-primary/30 rounded-sm"></div>
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="h-0.5 bg-popover rounded-sm"></div>
            <div className="h-0.5 bg-popover/50 rounded-sm w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RealtimeHeadlinesPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="h-1.5 bg-primary rounded-sm mb-0.5"></div>
      <div className="flex-1 flex flex-col gap-0.5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-0.5 items-start">
            <div className="w-1 h-1 bg-muted rounded-sm flex-shrink-0 mt-0.5"></div>
            <div className="w-2 h-1 bg-muted rounded-sm flex-shrink-0 mt-0.5"></div>
            <div className="flex-1 h-1 bg-popover rounded-sm mt-0.5"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewsStoryPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5">
      {/* Header */}
      <div className="h-1.5 bg-popover rounded-sm mb-0.5"></div>
      
      {/* Featured story card */}
      <div className="mb-1 p-[2px] bg-muted/20 rounded-sm">
        <div className="w-full h-3 bg-muted/60 rounded-sm mb-[2px]"></div>
        <div className="space-y-[1px]">
          <div className="h-[2px] bg-foreground/70 rounded-sm"></div>
          <div className="h-[2px] bg-foreground/50 rounded-sm w-4/5"></div>
        </div>
      </div>
      
      {/* Story list with thumbnails */}
      <div className="flex-1 space-y-[2px]">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-1 items-start p-[1px] hover:bg-muted/10 rounded-sm">
            {/* Thumbnail */}
            <div className="w-3 h-2.5 bg-muted/50 rounded-sm flex-shrink-0"></div>
            
            {/* Content */}
            <div className="flex-1 space-y-[1px]">
              <div className="h-[2px] bg-foreground/60 rounded-sm"></div>
              <div className="h-[1px] bg-foreground/40 rounded-sm w-4/5"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewsDashboardPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5">
      {/* Category tabs with arrows */}
      <div className="flex items-center gap-[2px] mb-0.5">
        <div className="w-1 h-1 bg-muted/40 rounded-sm"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`h-1 px-1 rounded-sm ${i === 0 ? 'bg-primary' : 'bg-muted/40'}`}></div>
        ))}
        <div className="w-1 h-1 bg-muted/40 rounded-sm"></div>
      </div>
      
      {/* Featured story with carousel arrows */}
      <div className="h-6 bg-muted/50 rounded-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Left arrow */}
        <div className="absolute left-[1px] top-1/2 -translate-y-1/2 w-1 h-1.5 bg-black/50 rounded-sm"></div>
        {/* Right arrow */}
        <div className="absolute right-[1px] top-1/2 -translate-y-1/2 w-1 h-1.5 bg-black/50 rounded-sm"></div>
        <div className="absolute bottom-[2px] left-[2px] right-[2px] space-y-[1px]">
          <div className="h-[2px] bg-white/80 rounded-sm"></div>
          <div className="h-[1px] bg-white/60 rounded-sm w-3/4"></div>
        </div>
      </div>
      
      {/* News grid */}
      <div className="grid grid-cols-4 gap-[2px]">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-muted/30 rounded-sm overflow-hidden">
            <div className="h-2 bg-muted/60"></div>
            <div className="p-[1px] space-y-[1px]">
              <div className="h-[1px] bg-foreground/50 rounded-sm"></div>
              <div className="h-[1px] bg-foreground/30 rounded-sm w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendingTopicsPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5">
      {/* Header */}
      <div className="h-1 bg-popover rounded-sm mb-0.5"></div>
      
      {/* Tag cloud - tags of different sizes */}
      <div className="flex-1 flex flex-wrap gap-[2px] content-start p-[1px]">
        {/* Larger tags */}
        <div className="px-1.5 py-[2px] bg-muted/60 border border-border/50 rounded-sm text-[3px] text-foreground/70">US Dollar</div>
        <div className="px-1.5 py-[2px] bg-primary/20 border border-primary/40 rounded-sm text-[3px] text-primary">Federal Reserve</div>
        <div className="px-1 py-[2px] bg-muted/60 border border-border/50 rounded-sm text-[3px] text-foreground/70">Interest Rates</div>
        
        {/* Medium tags */}
        <div className="px-1 py-[1px] bg-muted/50 border border-border/40 rounded-sm text-[2.5px] text-foreground/60">Trade Agreements</div>
        <div className="px-1 py-[1px] bg-muted/50 border border-border/40 rounded-sm text-[2.5px] text-foreground/60">Employment Data</div>
        <div className="px-1 py-[1px] bg-muted/50 border border-border/40 rounded-sm text-[2.5px] text-foreground/60">Currency Markets</div>
        
        {/* Smaller tags */}
        <div className="px-0.5 py-[1px] bg-muted/40 border border-border/30 rounded-sm text-[2px] text-foreground/50">Tariffs</div>
        <div className="px-0.5 py-[1px] bg-muted/40 border border-border/30 rounded-sm text-[2px] text-foreground/50">Risk Sentiment</div>
      </div>
    </div>
  );
}

export function LatestStoriesPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-[1px]">
      {/* Header */}
      <div className="h-1 bg-popover rounded-sm mb-0.5"></div>
      
      {/* List of stories */}
      <div className="flex-1 space-y-[1px]">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-[1px] items-start">
            {/* Icon */}
            <div className="w-[3px] h-[3px] bg-muted-foreground/60 rounded-sm mt-[1px] shrink-0"></div>
            
            {/* Content */}
            <div className="flex-1 space-y-[1px]">
              <div className="h-[2px] bg-foreground/60 rounded-sm"></div>
              <div className="h-[1px] bg-foreground/40 rounded-sm w-4/5"></div>
              <div className="h-[1px] bg-muted-foreground/30 rounded-sm w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewsSentimentPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      {/* Modern Legend Pills */}
      <div className="flex gap-[2px] mb-1">
        <div className="flex items-center gap-[1px] px-1 py-[1px] bg-destructive/10 border border-destructive/20">
          <div className="w-[2px] h-[2px] bg-destructive"></div>
        </div>
        <div className="flex items-center gap-[1px] px-1 py-[1px] bg-primary/10 border border-primary/20">
          <div className="w-[2px] h-[2px] bg-primary"></div>
        </div>
        <div className="flex items-center gap-[1px] px-1 py-[1px] bg-success/10 border border-success/20">
          <div className="w-[2px] h-[2px] bg-success"></div>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 flex items-end gap-[1px] px-[2px]">
        {[
          [3, 2, 2], [4, 1, 3], [2, 3, 2], [3, 2, 1], [5, 1, 1],
          [2, 2, 3], [3, 3, 2], [2, 1, 4], [4, 2, 1], [3, 3, 1]
        ].map((bar, i) => {
          const total = bar[0] + bar[1] + bar[2];
          const maxHeight = 8;
          const height = (total / 6) * maxHeight;
          const positiveHeight = (bar[0] / total) * height;
          const neutralHeight = (bar[1] / total) * height;
          const negativeHeight = (bar[2] / total) * height;
          
          return (
            <div key={i} className="flex-1 flex flex-col justify-end" style={{ height: `${height}px` }}>
              <div className="w-full bg-success/60" style={{ height: `${positiveHeight}px` }}></div>
              <div className="w-full bg-primary/60" style={{ height: `${neutralHeight}px` }}></div>
              <div className="w-full bg-destructive/60" style={{ height: `${negativeHeight}px` }}></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RiskSentimentPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-[2px]">
      <div className="h-1.5 bg-popover rounded-sm"></div>
      {/* Fear & Greed Gauge */}
      <div className="h-1.5 rounded-full overflow-hidden flex">
        <div className="flex-1 bg-[#ff4d6d]"></div>
        <div className="flex-1 bg-[#ff8c42]"></div>
        <div className="flex-1 bg-[#f97316]"></div>
        <div className="flex-1 bg-[#ffd60a]"></div>
        <div className="flex-1 bg-[#06d6a0]"></div>
      </div>
      {/* Stats boxes */}
      <div className="flex gap-[2px]">
        <div className="flex-1 h-2 bg-popover/50 rounded-sm"></div>
        <div className="flex-1 h-2 bg-popover/50 rounded-sm"></div>
      </div>
      {/* Bars */}
      <div className="flex-1 flex flex-col gap-[1px]">
        <div className="flex gap-[1px] items-center">
          <div className="flex-1 h-[2px] bg-success/40 rounded-sm"></div>
        </div>
        <div className="flex gap-[1px] items-center">
          <div className="flex-1 h-[2px] bg-destructive/40 rounded-sm"></div>
        </div>
        <div className="flex gap-[1px] items-center">
          <div className="flex-1 h-[2px] bg-muted/40 rounded-sm"></div>
        </div>
      </div>
    </div>
  );
}

export function RiskIndicatorPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="h-1.5 bg-popover rounded-sm mb-0.5"></div>
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-primary/80 rounded px-2 py-1 flex items-center gap-0.5">
          <svg className="w-1.5 h-1.5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M12 3L4 9l8 6 8-6-8-6z"/>
            <path d="M12 15l-8-6v6l8 6 8-6v-6l-8 6z"/>
      </svg>
        </div>
      </div>
    </div>
  );
}

export function TradingChartPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="h-2 bg-popover rounded-sm mb-1"></div>
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 40">
          <polyline
            points="5,30 15,25 25,20 35,15 45,18 55,12 65,8 75,10"
            fill="none"
            stroke="#f97316"
            strokeWidth="1"
          />
          <polyline
            points="5,35 15,32 25,28 35,25 45,27 55,22 65,18 75,20"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="0.5"
            opacity="0.5"
          />
        </svg>
      </div>
    </div>
  );
}

export function CurrencyStrengthMeterPreview() {
  const heights = [85, 65, 55, 75, 45, 70, 60, 80];
  return (
    <div className="w-full h-full bg-background p-1 flex items-end justify-around gap-[1px]">
      {heights.map((height, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-[1px] relative overflow-hidden"
          style={{ height: `${height}%` }}
        >
          <div 
            className="absolute inset-0 bg-gradient-to-t from-success/60 via-warning/30 to-destructive/60"
          ></div>
        </div>
      ))}
    </div>
  );
}

export function FXCrossRatesPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px]">
      <div className="grid grid-cols-5 grid-rows-5 gap-[1px] h-full">
        {[...Array(25)].map((_, i) => {
          const row = Math.floor(i / 5);
          const col = i % 5;
          const isHeader = row === 0 || col === 0;
          const isDiagonal = row === col && !isHeader;
          
          return (
            <div
              key={i}
              className={`rounded-[1px] ${
                isHeader 
                  ? 'bg-muted/40' 
                  : isDiagonal 
                    ? 'bg-muted/20' 
                    : (i % 3 === 0 ? 'bg-success/20' : i % 3 === 1 ? 'bg-destructive/20' : 'bg-muted/10')
              }`}
            ></div>
          );
        })}
      </div>
    </div>
  );
}

export function TickerTapeHeatmapPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex items-center">
      <div className="flex-1 flex gap-[2px] overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`flex-shrink-0 w-6 h-3 rounded-sm ${
              i % 3 === 0 ? 'bg-success/20' : i % 3 === 1 ? 'bg-destructive/20' : 'bg-muted/30'
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
}

export function StockHeatmapPreview() {
  return (
    <div className="w-full h-full bg-background p-1">
      <div className="grid grid-cols-3 grid-rows-2 gap-[1px] h-full">
        <div className="bg-destructive/30 rounded-[1px]"></div>
        <div className="bg-destructive/20 rounded-[1px]"></div>
        <div className="bg-success/10 rounded-[1px]"></div>
        <div className="bg-destructive/40 rounded-[1px]"></div>
        <div className="bg-destructive/15 rounded-[1px]"></div>
        <div className="bg-destructive/25 rounded-[1px]"></div>
      </div>
    </div>
  );
}

export function InterestRateProbabilityPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="text-[6px] text-muted-foreground">Federal Reserve</div>
        <div className="w-3 h-2.5 bg-destructive/30 rounded-sm"></div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <div className="bg-popover/40 rounded-sm h-2"></div>
        <div className="bg-popover/40 rounded-sm h-2"></div>
        <div className="bg-popover/40 rounded-sm h-2"></div>
      </div>
      <div className="flex items-end gap-1 flex-1">
        {[0.85, 0.2, 0.05].map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-destructive/40 rounded-t-sm"
            style={{ height: `${height * 100}%`, minHeight: '4px' }}
          ></div>
        ))}
      </div>
    </div>
  );
}

export function ImpliedForwardCurvePreview() {
  return (
    <div className="w-full h-full bg-background p-1">
      <svg viewBox="0 0 80 40" className="w-full h-full">
        <defs>
          <linearGradient id="curveArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(59,130,246,0.3)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0)" />
          </linearGradient>
        </defs>
        <polyline
          points="5,30 15,28 25,27 35,26 45,24 55,22 65,20 75,18"
          fill="none"
          stroke="rgb(59,130,246)"
          strokeWidth="1.5"
        />
        <polyline
          points="5,32 15,31 25,29 35,27 45,25 55,23 65,21 75,20"
          fill="none"
          stroke="rgb(34,197,94)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

export function ImpliedForwardRatesPreview() {
  return (
    <div className="w-full h-full bg-background p-1">
      <div className="w-full h-full relative">
        <svg viewBox="0 0 80 40" className="w-full h-full">
          <polyline
            points="5,35 15,25 30,24 45,30 60,33 75,38"
            fill="none"
            stroke="rgb(6,182,212)"
            strokeWidth="1.5"
          />
          {[15, 30, 45, 60].map((x, idx) => (
            <circle
              key={idx}
              cx={x}
              cy={[25, 24, 30, 33][idx]}
              r={2}
              fill="rgb(6,182,212)"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

export function ProbabilityTablePreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-[2px]">
      <div className="h-2 bg-widget-header rounded-sm"></div>
      <div className="grid grid-cols-4 grid-rows-3 gap-[1px] flex-1">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`rounded-[1px] ${
              i % 3 === 0
                ? 'bg-cyan-300/40'
                : i % 3 === 1
                  ? 'bg-cyan-200/30'
                  : 'bg-muted/20'
            }`}
          ></div>
        ))}
      </div>
    </div>
  );
}

export function EconomicEventCountdownPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col items-center justify-center gap-1">
      <div className="text-[6px] text-muted-foreground">Non-Farm Payrolls</div>
      <div className="flex items-center gap-1">
        {['23', '14', '05', '32'].map((num, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="text-[8px] font-mono text-foreground">{num}</div>
            <div className="text-[4px] text-muted-foreground">{i === 0 ? 'D' : i === 1 ? 'H' : i === 2 ? 'M' : 'S'}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-[1px] w-full">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-1 bg-popover/30 rounded-[1px]"></div>
        ))}
      </div>
    </div>
  );
}

export function MacroDataChartsPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="h-1.5 bg-popover rounded-sm mb-1"></div>
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 40">
          <polyline points="5,35 15,30 25,28 35,25 45,22 55,20 65,18 75,15" fill="none" stroke="#f97316" strokeWidth="1.5" />
          <polyline points="5,30 15,28 25,26 35,24 45,22 55,20 65,18 75,16" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
          <polyline points="5,25 15,23 25,21 35,20 45,19 55,18 65,17 75,16" fill="none" stroke="#22c55e" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="flex gap-1 mt-1">
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-[1px] bg-[#f97316]"></div>
          <div className="text-[4px] text-foreground">UK</div>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-[1px] bg-[#3b82f6]"></div>
          <div className="text-[4px] text-foreground">US</div>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-[1px] bg-[#22c55e]"></div>
          <div className="text-[4px] text-foreground">DE</div>
        </div>
      </div>
    </div>
  );
}

export function MacroDataTablePreview() {
  return (
    <div className="w-full h-full bg-background p-[2px]">
      <div className="h-full flex flex-col gap-[1px]">
        <div className="h-1 bg-popover/30 rounded-sm"></div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-[1px] flex-1">
            <div className="flex-1 bg-popover/20 rounded-[1px]"></div>
            <div className="flex-1 bg-popover/20 rounded-[1px]"></div>
            <div className="flex-1 bg-popover/20 rounded-[1px]"></div>
            <div className="flex-1 bg-popover/20 rounded-[1px]"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResearchFilesPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      {/* Header with search */}
      <div className="h-1.5 bg-popover rounded-sm mb-0.5"></div>
      
      {/* Breadcrumb/path */}
      <div className="flex gap-[1px] mb-1">
        <div className="w-3 h-[2px] bg-muted-foreground/40 rounded-sm"></div>
        <div className="w-1 h-[2px] bg-muted-foreground/20"></div>
        <div className="w-4 h-[2px] bg-muted-foreground/40 rounded-sm"></div>
      </div>
      
      {/* File list with icons */}
      <div className="flex-1 space-y-[2px]">
        {/* Folder item */}
        <div className="flex gap-1 items-center px-[1px] py-[1px]">
          <div className="w-2 h-1.5 bg-warning/70 rounded-[1px] flex-shrink-0"></div>
          <div className="h-[2px] flex-1 bg-foreground/60 rounded-sm"></div>
          <div className="w-1.5 h-[2px] bg-muted-foreground/30 rounded-sm"></div>
        </div>
        
        {/* PDF file */}
        <div className="flex gap-1 items-center px-[1px] py-[1px]">
          <div className="w-2 h-1.5 bg-destructive/70 rounded-[1px] flex-shrink-0"></div>
          <div className="h-[2px] flex-1 bg-foreground/50 rounded-sm"></div>
          <div className="w-2 h-[2px] bg-muted-foreground/30 rounded-sm"></div>
        </div>
        
        {/* Document file */}
        <div className="flex gap-1 items-center px-[1px] py-[1px]">
          <div className="w-2 h-1.5 bg-accent/70 rounded-[1px] flex-shrink-0"></div>
          <div className="h-[2px] flex-1 bg-foreground/50 rounded-sm"></div>
          <div className="w-2 h-[2px] bg-muted-foreground/30 rounded-sm"></div>
        </div>
        
        {/* Folder item */}
        <div className="flex gap-1 items-center px-[1px] py-[1px]">
          <div className="w-2 h-1.5 bg-warning/70 rounded-[1px] flex-shrink-0"></div>
          <div className="h-[2px] flex-1 bg-foreground/60 rounded-sm"></div>
          <div className="w-1.5 h-[2px] bg-muted-foreground/30 rounded-sm"></div>
        </div>
        
        {/* Excel file */}
        <div className="flex gap-1 items-center px-[1px] py-[1px]">
          <div className="w-2 h-1.5 bg-success/70 rounded-[1px] flex-shrink-0"></div>
          <div className="h-[2px] flex-1 bg-foreground/50 rounded-sm"></div>
          <div className="w-2 h-[2px] bg-muted-foreground/30 rounded-sm"></div>
        </div>
      </div>
    </div>
  );
}

export function SmartBiasPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5">
      <div className="h-1.5 bg-popover rounded-sm mb-0.5"></div>
      <div className="flex gap-0.5 mb-[1px]">
        <div className="w-1/4 h-1 bg-popover rounded-sm"></div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-popover rounded-sm"></div>
        ))}
      </div>
      {[...Array(6)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-0.5">
          <div className="w-1/4 h-1.5 bg-popover rounded-sm"></div>
          {[...Array(6)].map((_, colIndex) => {
            const colors = ["bg-success/40", "bg-warning/40", "bg-destructive/40", "bg-muted/40"];
            const color = colors[(rowIndex + colIndex) % colors.length];
            return (
              <div key={colIndex} className={`flex-1 h-1.5 ${color} rounded-sm`}></div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function SmartBiasChartPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      {/* Header */}
      <div className="h-1.5 bg-popover rounded-sm mb-1"></div>
      
      {/* Table grid */}
      <div className="flex-1 flex flex-col gap-[1px]">
        {/* Header row */}
        <div className="flex gap-[1px] items-center">
          <div className="w-4 h-1 bg-muted-foreground/40 rounded-sm flex-shrink-0"></div>
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 h-1 rounded-sm ${
                i === 0 ? 'bg-primary/50 ring-1 ring-primary/60' : 'bg-muted-foreground/30'
              }`}
            ></div>
          ))}
        </div>
        
        {/* Data rows */}
        <div className="flex-1 flex flex-col gap-[1px]">
          {[
            ['#059669', '#10b981', '#6b7280', '#ef4444', '#dc2626', '#10b981'],
            ['#10b981', '#059669', '#10b981', '#6b7280', '#ef4444', '#dc2626'],
            ['#6b7280', '#10b981', '#059669', '#10b981', '#6b7280', '#ef4444'],
            ['#ef4444', '#6b7280', '#10b981', '#059669', '#10b981', '#6b7280'],
            ['#dc2626', '#ef4444', '#6b7280', '#10b981', '#059669', '#10b981'],
            ['#10b981', '#dc2626', '#ef4444', '#6b7280', '#10b981', '#059669'],
          ].map((colors, rowIndex) => (
            <div key={rowIndex} className="flex gap-[1px] flex-1">
              {/* Currency */}
              <div className="w-4 bg-muted/60 rounded-sm flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-1 bg-foreground/30 rounded-[1px]"></div>
              </div>
              {/* Bias cells */}
              {colors.map((color, colIndex) => (
                <div 
                  key={colIndex}
                  style={{ backgroundColor: color }}
                  className={`flex-1 rounded-sm ${
                    colIndex === 0 ? 'ring-1 ring-primary/60' : ''
                  }`}
                ></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FXVolatilityLevelsPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      {/* Header */}
      <div className="h-1.5 bg-popover rounded-sm mb-1"></div>
      
      {/* Chart area */}
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 40">
          {/* Candlesticks */}
          {[
            { x: 5, open: 25, close: 22, high: 28, low: 20 },
            { x: 13, open: 22, close: 24, high: 26, low: 21 },
            { x: 21, open: 24, close: 23, high: 27, low: 22 },
            { x: 29, open: 23, close: 25, high: 26, low: 21 },
            { x: 37, open: 25, close: 27, high: 28, low: 24 },
            { x: 45, open: 27, close: 26, high: 29, low: 25 },
            { x: 53, open: 26, close: 28, high: 30, low: 25 },
            { x: 61, open: 28, close: 27, high: 29, low: 26 },
            { x: 69, open: 27, close: 29, high: 31, low: 26 },
          ].map((candle, i) => {
            const isBullish = candle.close > candle.open;
            const color = isBullish ? '#10b981' : '#ef4444';
            return (
              <g key={i}>
                {/* Wick */}
                <line
                  x1={candle.x}
                  y1={candle.low}
                  x2={candle.x}
                  y2={candle.high}
                  stroke={color}
                  strokeWidth="0.5"
                />
                {/* Body */}
                <rect
                  x={candle.x - 1.5}
                  y={Math.min(candle.open, candle.close)}
                  width="3"
                  height={Math.abs(candle.close - candle.open)}
                  fill={color}
                />
              </g>
            );
          })}
          
          {/* Volatility levels */}
          <line
            x1="0"
            y1="8"
            x2="80"
            y2="8"
            stroke="#f97316"
            strokeWidth="0.8"
            strokeDasharray="2 2"
            opacity="0.7"
          />
          <line
            x1="0"
            y1="32"
            x2="80"
            y2="32"
            stroke="#f97316"
            strokeWidth="0.8"
            strokeDasharray="2 2"
            opacity="0.7"
          />
        </svg>
      </div>
    </div>
  );
}

export function FXOptionsExpiryPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col">
      {/* Header */}
      <div className="h-1 bg-popover rounded-sm mb-[1px]"></div>
      
      {/* Table rows */}
      <div className="flex-1 flex flex-col gap-[1px]">
        {/* Date row */}
        <div className="flex gap-[1px]">
          <div className="w-3 h-1.5 bg-primary/40 rounded-sm flex-shrink-0"></div>
          <div className="flex-1 h-1.5 bg-popover/30 rounded-sm"></div>
        </div>
        
        {/* Currency pair rows */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-[1px] flex-1">
            {/* Currency pair */}
            <div className="w-3 bg-muted/40 rounded-sm flex-shrink-0 flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-foreground/30 rounded-[1px]"></div>
            </div>
            {/* Strike prices */}
            <div className="flex-1 flex gap-[1px]">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex-1 bg-popover/20 rounded-[1px]"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RiskReversalsPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col">
      <div className="flex items-center justify-between text-[6px] text-muted-foreground mb-[1px]">
        <div className="flex items-center gap-[2px]">
          <span className="w-2 h-0.5 bg-[#ef4444] rounded-full"></span>
          <span>MRR</span>
        </div>
        <div className="flex items-center gap-[2px]">
          <span className="w-2 h-0.5 bg-[#22c55e] rounded-full"></span>
          <span>MO</span>
        </div>
      </div>
      <div className="flex-1 relative">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 50">
          <rect x="0" y="0" width="80" height="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          {[10, 20, 30, 40].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="80"
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.4"
            />
          ))}
          <polyline
            points="0,32 10,30 20,28 30,27 40,26 50,25 60,26 70,28 80,29"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1"
          />
          <polyline
            points="0,25 10,24 20,23 30,22 40,21 50,22 60,23 70,24 80,23"
            fill="none"
            stroke="#22c55e"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
}

export function DistributionChartPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      {/* Bell curve */}
      <div className="flex-1 relative flex items-end justify-center">
        <svg className="w-full h-full" viewBox="0 0 40 30">
          {/* Histogram bars */}
          {[0.2, 0.4, 0.6, 0.8, 1, 0.8, 0.6, 0.4, 0.2].map((height, i) => (
            <rect
              key={i}
              x={4 + i * 3.5}
              y={25 - height * 20}
              width="3"
              height={height * 20}
              fill="#333333"
              opacity="0.7"
            />
          ))}
          {/* Bell curve line */}
          <path
            d="M 4 25 Q 12 15, 20 10 T 36 25"
            fill="none"
            stroke="#f97316"
            strokeWidth="0.8"
          />
          {/* Mean line */}
          <line
            x1="20"
            y1="5"
            x2="20"
            y2="25"
            stroke="#f97316"
            strokeWidth="0.5"
            strokeDasharray="1,1"
            opacity="0.5"
          />
        </svg>
      </div>
      {/* Stats bar */}
      <div className="flex gap-1 mt-1">
        <div className="flex-1 h-1 bg-primary/20 rounded"></div>
        <div className="flex-1 h-1 bg-primary/20 rounded"></div>
        <div className="flex-1 h-1 bg-primary/20 rounded"></div>
      </div>
    </div>
  );
}

export function AverageDailyRangePreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-1">
      {/* Range bar */}
      <div className="relative h-3 bg-background rounded border border-border/50">
        <div className="absolute inset-0 rounded overflow-hidden bg-gradient-to-r from-red-500/10 via-transparent to-green-500/10"></div>
        <div className="absolute top-0 bottom-0 w-0.5 bg-primary" style={{ left: '60%' }}>
          <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[2px] border-l-transparent border-r-[2px] border-r-transparent border-t-[2px] border-t-primary"></div>
        </div>
      </div>
      {/* Table rows */}
      <div className="flex-1 flex flex-col gap-[1px]">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-1">
            <div className="flex-1 h-1 bg-popover/30 rounded"></div>
            <div className="w-4 h-1 bg-primary/20 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AverageRangeHistogramPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      {/* Y-axis and bars */}
      <div className="flex-1 flex gap-0.5 items-end">
        {[0.3, 0.5, 0.7, 0.9, 0.8, 0.6, 0.4].map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-primary rounded-t"
            style={{ height: `${height * 100}%`, minHeight: '2px' }}
          ></div>
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-0.5 mt-0.5">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="w-full h-0.5 bg-muted-foreground/20"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RangeProbabilityPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col">
      {/* Header */}
      <div className="h-1 bg-popover rounded-sm mb-[1px]"></div>
      {/* Table rows */}
      <div className="flex-1 flex flex-col gap-[1px]">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-[1px]">
            <div className="w-4 h-1 bg-popover/30 rounded"></div>
            <div className="w-4 h-1 bg-popover/30 rounded"></div>
            <div className="flex-1 h-1 bg-popover/20 rounded"></div>
            <div className="flex-1 h-1 bg-popover/20 rounded"></div>
            <div className="flex-1 h-1 bg-primary/20 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DistributionStatsPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col">
      {/* Header */}
      <div className="h-1 bg-popover rounded-sm mb-[1px]"></div>
      {/* Stats rows */}
      <div className="flex-1 flex flex-col gap-[1px]">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-[1px]">
            <div className="flex-1 h-1 bg-popover/30 rounded"></div>
            <div className="w-6 h-1 bg-popover/20 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VolatilityStatisticsPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col">
      {/* Header */}
      <div className="h-1 bg-popover rounded-sm mb-[1px]"></div>
      {/* Table rows */}
      <div className="flex-1 flex flex-col gap-[1px]">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-[1px]">
            <div className="w-5 h-1 bg-popover/30 rounded"></div>
            {[...Array(4)].map((_, j) => (
              <div key={j} className="flex-1 h-1 bg-popover/20 rounded"></div>
            ))}
            <div className="w-4 h-1 bg-green-500/20 rounded"></div>
            <div className="w-4 h-1 bg-red-500/20 rounded"></div>
            <div className="w-4 h-1 bg-primary/20 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Utilities Widget Previews
export function WatchlistPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      <div className="flex gap-0.5 mb-1">
        <div className="w-1/4 h-1.5 bg-muted rounded-sm"></div>
        <div className="w-1/4 h-1.5 bg-muted rounded-sm"></div>
        <div className="flex-1 h-1.5 bg-muted rounded-sm"></div>
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-0.5 mb-0.5">
          <div className="w-1/4 h-1.5 bg-popover rounded-sm"></div>
          <div className="w-1/4 h-1.5 bg-success/20 rounded-sm"></div>
          <div className="flex-1 h-1.5 bg-popover rounded-sm"></div>
        </div>
      ))}
    </div>
  );
}

export function BlockedWidgetPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5 relative">
      <div className="h-1.5 bg-popover rounded-sm mb-0.5"></div>
      <div className="flex-1 bg-widget-body rounded-sm opacity-30"></div>
      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/60">
        <div className="w-3 h-3 rounded-full border border-primary/80 flex items-center justify-center">
          <div className="w-1 h-1.5 border border-primary/80 rounded-t-sm border-b-0"></div>
        </div>
      </div>
    </div>
  );
}

export function EducationAreaPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex gap-0.5">
      {/* Lessons list */}
      <div className="flex-1 flex flex-col gap-[1px]">
        <div className="h-1.5 bg-popover rounded-sm mb-0.5"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-0.5 items-center">
            <div className="w-3 h-2 bg-muted rounded-sm"></div>
            <div className="flex-1 flex flex-col gap-[1px]">
              <div className="h-[2px] bg-foreground/60 rounded-sm"></div>
              <div className="h-[2px] bg-muted-foreground/40 rounded-sm w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
      {/* Progress side */}
      <div className="w-1/3 flex flex-col gap-0.5">
        <div className="h-3 bg-primary/20 rounded-sm"></div>
        <div className="h-[2px] bg-primary rounded-sm w-2/3"></div>
        <div className="flex gap-0.5 mt-0.5">
          <div className="flex-1 h-2 bg-muted rounded-sm"></div>
          <div className="flex-1 h-2 bg-muted rounded-sm"></div>
        </div>
      </div>
    </div>
  );
}

export function WorldClockPreview() {
  return (
    <div className="w-full h-full bg-background p-0.5 flex flex-col">
      <div className="h-1 bg-popover rounded-sm mb-0.5"></div>
      <div className="flex-1 grid grid-cols-4 gap-[1px]">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-widget-header/50 flex flex-col items-center justify-center gap-[1px]">
            <div className="w-4 h-2 bg-foreground/80 rounded-[1px]"></div>
            <div className="w-3 h-[2px] bg-primary/60 rounded-[1px]"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MoodBoardPreview() {
  return (
    <div className="w-full h-full bg-background p-0.5 flex">
      <div className="w-2 bg-widget-header border-r border-border/30 flex flex-col items-center gap-[1px] py-[1px]">
        <div className="w-1 h-1 bg-muted-foreground/40 rounded-[1px]"></div>
        <div className="w-1 h-1 bg-primary/60 rounded-[1px]"></div>
        <div className="w-1 h-1 bg-muted-foreground/40 rounded-[1px]"></div>
      </div>
      <div className="flex-1 relative">
        <div className="absolute top-1 left-1 w-4 h-3 bg-primary/20 rounded-[1px]"></div>
        <div className="absolute top-2 right-2 w-3 h-2.5 bg-foreground/30 rounded-[1px]"></div>
        <div className="absolute bottom-1 left-2 w-3.5 h-2 bg-warning/30 rounded-[1px]"></div>
      </div>
    </div>
  );
}

export function NotesPreview() {
  return (
    <div className="w-full h-full bg-background p-0.5 flex flex-col">
      <div className="h-1 bg-widget-header rounded-sm mb-0.5"></div>
      <div className="h-1 bg-background border-b border-border/30 mb-0.5 flex gap-[1px] px-[1px]">
        <div className="w-1 h-full bg-muted-foreground/40"></div>
        <div className="w-1 h-full bg-muted-foreground/40"></div>
        <div className="w-1 h-full bg-muted-foreground/40"></div>
      </div>
      <div className="flex-1 bg-background p-[2px] space-y-[1px]">
        <div className="w-full h-[2px] bg-foreground/60 rounded-[0.5px]"></div>
        <div className="w-4/5 h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
        <div className="w-3/4 h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
      </div>
    </div>
  );
}

export function TicklistPreview() {
  return (
    <div className="w-full h-full bg-background p-0.5 flex flex-col">
      {/* Header */}
      <div className="h-1 bg-widget-header rounded-sm mb-0.5"></div>
      
      {/* Task items */}
      <div className="flex-1 space-y-[1px]">
        {/* Unchecked task */}
        <div className="flex items-center gap-[1px] p-[1px]">
          <div className="w-1 h-1 border border-muted-foreground/50 rounded-[0.5px]"></div>
          <div className="flex-1 h-[2px] bg-foreground/60 rounded-[0.5px]"></div>
        </div>
        
        {/* Checked task (orange) */}
        <div className="flex items-center gap-[1px] p-[1px]">
          <div className="w-1 h-1 bg-primary rounded-[0.5px] flex items-center justify-center">
            <div className="w-[2px] h-[2px] bg-white rounded-[0.5px]"></div>
          </div>
          <div className="flex-1 h-[2px] bg-muted-foreground/50 rounded-[0.5px]"></div>
        </div>
        
        {/* Unchecked task */}
        <div className="flex items-center gap-[1px] p-[1px]">
          <div className="w-1 h-1 border border-muted-foreground/50 rounded-[0.5px]"></div>
          <div className="flex-1 h-[2px] bg-foreground/60 rounded-[0.5px]"></div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="h-[2px] bg-widget-header rounded-sm mt-0.5"></div>
    </div>
  );
}

export function ScoringTablePreview() {
  return (
    <div className="w-full h-full bg-background p-0.5 flex flex-col gap-[1px]">
      {/* Currency flags row */}
      <div className="flex gap-[1px]">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-1 h-[2px] bg-primary/30 rounded-[0.5px]"></div>
        ))}
      </div>
      
      {/* Category sections */}
      <div className="flex-1 flex flex-col gap-[1.5px]">
        {/* Category 1 */}
        <div className="flex-1 bg-widget-header/50 rounded-[0.5px] p-[1px]">
          <div className="h-[1.5px] bg-muted-foreground/40 rounded-[0.5px] mb-[1px]"></div>
          <div className="grid grid-cols-2 gap-[0.5px]">
            <div className="h-[2px] bg-[#059669] rounded-[0.5px]"></div>
            <div className="h-[2px] bg-[#dc2626] rounded-[0.5px]"></div>
            <div className="h-[2px] bg-[#6b7280] rounded-[0.5px]"></div>
            <div className="h-[2px] bg-[#047857] rounded-[0.5px]"></div>
          </div>
        </div>
        
        {/* Category 2 */}
        <div className="flex-1 bg-widget-header/50 rounded-[0.5px] p-[1px]">
          <div className="h-[1.5px] bg-muted-foreground/40 rounded-[0.5px] mb-[1px]"></div>
          <div className="grid grid-cols-2 gap-[0.5px]">
            <div className="h-[2px] bg-[#dc2626] rounded-[0.5px]"></div>
            <div className="h-[2px] bg-[#059669] rounded-[0.5px]"></div>
            <div className="h-[2px] bg-[#059669] rounded-[0.5px]"></div>
            <div className="h-[2px] bg-[#6b7280] rounded-[0.5px]"></div>
          </div>
        </div>
      </div>
      
      {/* Overall summary */}
      <div className="h-[2.5px] bg-primary/10 border border-primary/30 rounded-[0.5px]"></div>
    </div>
  );
}

export function TradingJournalPreview() {
  return (
    <div className="w-full h-full bg-background p-0.5 flex flex-col">
      {/* Header */}
      <div className="h-[3px] bg-widget-header rounded-[0.5px] mb-[1px]"></div>
      
      {/* Table Header */}
      <div className="grid grid-cols-7 gap-[0.5px] mb-[1px]">
        {[1,2,3,4,5,6,7].map((i) => (
          <div key={i} className="h-[2px] bg-muted-foreground/30 rounded-[0.5px]"></div>
        ))}
      </div>
      
      {/* Trade Rows */}
      <div className="flex-1 flex flex-col gap-[1px]">
        {/* Row 1 - Win */}
        <div className="grid grid-cols-7 gap-[0.5px] items-center">
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[1.5px] bg-green-500 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-primary rounded-[0.5px]"></div>
        </div>
        
        {/* Row 2 - Open */}
        <div className="grid grid-cols-7 gap-[0.5px] items-center">
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[1.5px] bg-blue-500 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/30 rounded-[0.5px]"></div>
        </div>
        
        {/* Row 3 - Loss */}
        <div className="grid grid-cols-7 gap-[0.5px] items-center">
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/40 rounded-[0.5px]"></div>
          <div className="h-[1.5px] bg-red-500 rounded-[0.5px]"></div>
          <div className="h-[2px] bg-foreground/30 rounded-[0.5px]"></div>
        </div>
      </div>
    </div>
  );
}

export function ExchangeMarketHoursPreview() {
  return (
    <div className="w-full h-full bg-background p-0.5 flex flex-col gap-[1px]">
      {/* Header */}
      <div className="h-[3px] bg-widget-header rounded-[0.5px]"></div>
      
      {/* Market sessions with status indicators */}
      <div className="flex-1 flex flex-col gap-[2px] py-[1px]">
        {/* Sydney - Brighter Blue */}
        <div className="flex items-center gap-[1px]">
          <div className="w-[2px] h-[2px] rounded-full bg-blue-400/60"></div>
          <div className="flex-1 relative h-[3px] bg-background/50 rounded-[0.5px]">
            <div className="absolute left-[91%] w-[9%] h-full bg-blue-400/50 rounded-[0.5px] border border-blue-400/60"></div>
          </div>
        </div>
        
        {/* Tokyo - Rose/Pink (OPEN) */}
        <div className="flex items-center gap-[1px]">
          <div className="w-[2px] h-[2px] rounded-full bg-rose-400"></div>
          <div className="flex-1 relative h-[3px] bg-background/50 rounded-[0.5px]">
            <div className="absolute left-0 w-[37.5%] h-full bg-rose-400/50 rounded-[0.5px] border border-rose-400/70"></div>
          </div>
        </div>
        
        {/* London - Yellow (OPEN) */}
        <div className="flex items-center gap-[1px]">
          <div className="w-[2px] h-[2px] rounded-full bg-yellow-400"></div>
          <div className="flex-1 relative h-[3px] bg-background/50 rounded-[0.5px]">
            <div className="absolute left-[33%] w-[37.5%] h-full bg-yellow-400/50 rounded-[0.5px] border border-yellow-400/70"></div>
          </div>
        </div>
        
        {/* New York - Purple (OPEN) */}
        <div className="flex items-center gap-[1px]">
          <div className="w-[2px] h-[2px] rounded-full bg-purple-400"></div>
          <div className="flex-1 relative h-[3px] bg-background/50 rounded-[0.5px]">
            <div className="absolute left-[62.5%] w-[37.5%] h-full bg-purple-400/50 rounded-[0.5px] border border-purple-400/70"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TabMenuPreview() {
  return (
    <div className="w-full h-full bg-background p-0.5 flex flex-col">
      {/* Tab headers */}
      <div className="flex gap-[1px] mb-0.5">
        <div className="flex-1 h-1.5 bg-primary/20 border border-primary/30 rounded-t-[1px]"></div>
        <div className="flex-1 h-1.5 bg-widget-header rounded-t-[1px]"></div>
        <div className="flex-1 h-1.5 bg-widget-header rounded-t-[1px]"></div>
      </div>
      {/* Tab content area */}
      <div className="flex-1 bg-widget-body rounded-sm p-[2px]">
        <div className="grid grid-cols-2 gap-[1px] h-full">
          <div className="bg-popover/20 rounded-[1px]"></div>
          <div className="bg-popover/20 rounded-[1px]"></div>
          <div className="bg-popover/20 rounded-[1px]"></div>
          <div className="bg-popover/20 rounded-[1px]"></div>
        </div>
      </div>
    </div>
  );
}

export function CalculatorPreview() {
  return (
    <div className="w-full h-full bg-background p-0.5 flex flex-col gap-[1px]">
      {/* Display */}
      <div className="h-2 bg-black/40 border border-border/60 rounded-sm mb-0.5 flex items-center justify-end pr-1">
        <div className="w-8 h-1 bg-foreground/60 rounded-[0.5px]"></div>
      </div>
      {/* Button grid */}
      <div className="grid grid-cols-4 gap-[1px] flex-1">
        {/* Row 1: C, ±, %, ÷ */}
        <div className="bg-widget-header rounded-[1px]"></div>
        <div className="bg-widget-header rounded-[1px]"></div>
        <div className="bg-widget-header rounded-[1px]"></div>
        <div className="bg-primary/20 rounded-[1px]"></div>
        {/* Row 2: 7, 8, 9, × */}
        <div className="bg-widget-header rounded-[1px]"></div>
        <div className="bg-widget-header rounded-[1px]"></div>
        <div className="bg-widget-header rounded-[1px]"></div>
        <div className="bg-primary/20 rounded-[1px]"></div>
        {/* Row 3: 4, 5, 6, - */}
        <div className="bg-widget-header rounded-[1px]"></div>
        <div className="bg-widget-header rounded-[1px]"></div>
        <div className="bg-widget-header rounded-[1px]"></div>
        <div className="bg-primary/20 rounded-[1px]"></div>
        {/* Row 4: 1, 2, 3, + */}
        <div className="bg-widget-header rounded-[1px]"></div>
        <div className="bg-widget-header rounded-[1px]"></div>
        <div className="bg-widget-header rounded-[1px]"></div>
        <div className="bg-primary/20 rounded-[1px]"></div>
        {/* Row 5: 0 (span 2), ., = */}
        <div className="bg-widget-header rounded-[1px] col-span-2"></div>
        <div className="bg-widget-header rounded-[1px]"></div>
        <div className="bg-primary rounded-[1px]"></div>
      </div>
    </div>
  );
}

export function DMXPositioningPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex items-center justify-center">
      <svg className="w-full h-full" viewBox="0 0 40 40">
        {/* Donut chart representing long/short positions */}
        <circle cx="20" cy="20" r="12" fill="none" stroke="#ff4d6d" strokeWidth="4" strokeDasharray="30 75" />
        <circle cx="20" cy="20" r="12" fill="none" stroke="#06d6a0" strokeWidth="4" strokeDasharray="45 75" strokeDashoffset="-30" />
      </svg>
    </div>
  );
}

export function DMXChartPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5">
      {/* Header with controls */}
      <div className="h-1.5 bg-popover rounded-sm mb-0.5"></div>
      
      {/* Stacked bar chart */}
      <div className="flex-1 flex items-end gap-[1px] px-1 pb-1">
        {/* Bars representing long/short positions */}
        {[
          { long: 42, short: 58 },
          { long: 45, short: 55 },
          { long: 41, short: 59 },
          { long: 38, short: 62 },
          { long: 15, short: 85 },
          { long: 48, short: 52 },
          { long: 52, short: 48 },
          { long: 55, short: 45 },
          { long: 68, short: 32 },
          { long: 12, short: 88 },
          { long: 58, short: 42 },
          { long: 48, short: 52 },
          { long: 36, short: 64 },
          { long: 28, short: 72 },
          { long: 24, short: 76 },
        ].map((bar, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            {/* Long position (top, green) */}
            <div
              className="w-full rounded-t-[1px]"
              style={{
                backgroundColor: "#22c55e",
                height: `${bar.long * 0.4}%`,
              }}
            />
            {/* Short position (bottom, red) */}
            <div
              className="w-full rounded-b-[1px]"
              style={{
                backgroundColor: "#ef4444",
                height: `${bar.short * 0.4}%`,
              }}
            />
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex gap-1 justify-center">
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-sm" style={{ backgroundColor: "#22c55e" }}></div>
          <div className="h-[2px] w-2 bg-muted-foreground/40 rounded-sm"></div>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-sm" style={{ backgroundColor: "#ef4444" }}></div>
          <div className="h-[2px] w-2 bg-muted-foreground/40 rounded-sm"></div>
        </div>
      </div>
    </div>
  );
}

export function DMXStatisticsTablePreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5">
      {/* Header */}
      <div className="h-1.5 bg-popover rounded-sm mb-0.5"></div>
      
      {/* Table rows */}
      <div className="flex-1 flex flex-col gap-[1px] px-1">
        {[
          { color: "#22c55e" },
          { color: "#ef4444" },
          { color: "#a1a1aa" },
          { color: "#22c55e" },
          { color: "#ef4444" },
          { color: "#22c55e" },
          { color: "#ef4444" },
          { color: "#22c55e" },
          { color: "#ef4444" },
        ].map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-1">
            <div className="h-[2px] flex-1 bg-muted-foreground/30 rounded-sm"></div>
            <div
              className="h-[2px] w-2 rounded-sm"
              style={{ backgroundColor: row.color }}
            ></div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="h-[2px] bg-muted-foreground/20 rounded-sm mt-0.5"></div>
    </div>
  );
}

export function DMXOverviewPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5">
      {/* Header */}
      <div className="h-1.5 bg-popover rounded-sm mb-0.5"></div>
      
      {/* Legend */}
      <div className="h-1 bg-popover/50 rounded-sm mb-0.5"></div>
      
      {/* Stacked horizontal bars */}
      <div className="flex-1 flex flex-col gap-[1px] px-1">
        {[
          { long: 6, short: 94 },
          { long: 30, short: 70 },
          { long: 11, short: 89 },
          { long: 48, short: 52 },
          { long: 23, short: 77 },
          { long: 83, short: 17 },
          { long: 16, short: 84 },
          { long: 58, short: 42 },
          { long: 94, short: 6 },
          { long: 16, short: 84 },
          { long: 6, short: 94 },
          { long: 96, short: 4 },
        ].map((bar, i) => (
          <div key={i} className="flex h-[2px] gap-[1px]">
            <div
              className="rounded-sm"
              style={{
                backgroundColor: "#22c55e",
                width: `${bar.long}%`,
              }}
            ></div>
            <div
              className="rounded-sm"
              style={{
                backgroundColor: "#ef4444",
                width: `${bar.short}%`,
              }}
            ></div>
          </div>
        ))}
      </div>
      
      {/* X-axis */}
      <div className="h-[2px] bg-popover/50 rounded-sm mt-0.5"></div>
    </div>
  );
}

export function DMXOpenInterestPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5">
      {/* Header */}
      <div className="h-1.5 bg-popover rounded-sm mb-0.5"></div>
      
      {/* Checkbox toggles */}
      <div className="h-1 bg-popover/50 rounded-sm mb-0.5"></div>
      
      {/* Multi-line chart */}
      <div className="flex-1 flex items-end gap-[1px] px-1 pb-1 relative">
        {/* Multiple lines */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          {/* Line 1 - Blue */}
          <polyline
            points="0,20 10,18 20,22 30,15 40,25 50,20 60,18 70,23 80,19 90,21 100,17"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          {/* Line 2 - Red */}
          <polyline
            points="0,30 10,28 20,32 30,25 40,35 50,30 60,28 70,33 80,29 90,31 100,27"
            fill="none"
            stroke="#ef4444"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          {/* Line 3 - Green */}
          <polyline
            points="0,40 10,38 20,42 30,35 40,45 50,40 60,38 70,43 80,39 90,41 100,37"
            fill="none"
            stroke="#22c55e"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          {/* Line 4 - Orange */}
          <polyline
            points="0,50 10,48 20,52 30,45 40,55 50,50 60,48 70,53 80,49 90,51 100,47"
            fill="none"
            stroke="#f97316"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          {/* Line 5 - Purple */}
          <polyline
            points="0,60 10,58 20,62 30,55 40,65 50,60 60,58 70,63 80,59 90,61 100,57"
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}

export function MacroAIPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5">
      {/* Header / mode toggle */}
      <div className="flex gap-[2px]">
        <div className="h-1 bg-popover rounded-sm flex-1"></div>
        <div className="h-1 bg-primary/40 rounded-sm w-4"></div>
      </div>

      {/* Conversation */}
      <div className="flex-1 flex flex-col gap-[2px]">
        <div className="flex justify-start">
          <div className="w-4/5 h-[2px] bg-popover rounded-sm"></div>
        </div>
        <div className="flex justify-end">
          <div className="w-3/5 h-[2px] bg-primary/30 rounded-sm"></div>
        </div>
        <div className="flex justify-start">
          <div className="w-[85%] h-[2px] bg-popover rounded-sm"></div>
        </div>
        <div className="flex justify-end">
          <div className="w-[55%] h-[2px] bg-primary/30 rounded-sm"></div>
        </div>
        <div className="flex justify-start">
          <div className="w-[70%] h-[2px] bg-popover rounded-sm"></div>
        </div>
      </div>

      {/* Input */}
      <div className="h-[3px] bg-popover/50 rounded-sm border border-border/40"></div>
    </div>
  );
}

export function LiveSquawkPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-[2px]">
      {/* Header */}
      <div className="flex gap-[2px]">
        <div className="flex-1 h-1 bg-popover rounded-sm"></div>
        <div className="w-6 h-1 bg-destructive/40 rounded-sm"></div>
      </div>

      {/* Feed */}
      <div className="flex-1 flex flex-col gap-[1px]">
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className={`flex items-center gap-[2px] rounded-sm ${i === 0 ? 'bg-destructive/5' : ''}`}
          >
            <div className="w-6 h-[2px] bg-popover/50 rounded-sm"></div>
            {i === 0 && <div className="w-[2px] h-[2px] bg-destructive rounded-full"></div>}
            <div className="flex-1 flex flex-col gap-[1px]">
              <div className="h-[2px] bg-foreground/50 rounded-sm"></div>
              <div className="h-[1px] bg-foreground/30 rounded-sm w-4/5"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="h-[2px] bg-popover/30 rounded-sm"></div>
    </div>
  );
}

export function WeekAheadPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-0.5">
      {/* Controls */}
      <div className="flex gap-[1px]">
        <div className="w-4 h-1 bg-popover/40 rounded-sm"></div>
        <div className="flex-1 h-1 bg-popover rounded-sm"></div>
        <div className="w-4 h-1 bg-popover/40 rounded-sm"></div>
      </div>

      {/* Timeline */}
      <div className="flex-1 flex flex-col gap-[2px]">
        {[
          { highlight: false, bars: 1 },
          { highlight: true, bars: 3 },
          { highlight: false, bars: 1 },
        ].map((day, idx) => (
          <div key={idx} className="flex gap-[2px] items-start">
            <div
              className={`w-6 h-[6px] rounded-full ${
                day.highlight ? 'bg-primary border border-primary' : 'bg-popover border border-border/40'
              }`}
            ></div>
            <div className="flex-1 flex flex-col gap-[1px]">
              {Array.from({ length: day.bars }).map((_, i) => (
                <div
                  key={i}
                  className="h-[2px] rounded-sm border-l-2 pl-[1px]"
                  style={{
                    borderColor: i === 0 ? '#ef4444' : '#f97316',
                    backgroundColor: 'rgba(249,115,22,0.25)',
                  }}
                ></div>
              ))}
              <div className="h-[1px] bg-popover/50 rounded-sm"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="h-[2px] bg-popover/30 rounded-sm border-t border-border/20"></div>
    </div>
  );
}

export function BankTradesPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex gap-[2px]">
      {/* Table */}
      <div className="flex-1 flex flex-col">
        <div className="h-1 bg-popover/50 rounded-sm mb-[2px]"></div>
        <div className="flex-1 flex flex-col gap-[1px]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-[1px]">
              <div className="w-[25%] h-[2px] bg-popover/60 rounded-sm"></div>
              <div className="w-[15%] h-[2px] bg-popover/40 rounded-sm"></div>
              <div className="w-[12%] h-[2px] bg-primary/30 rounded-sm"></div>
              <div className="w-[12%] h-[2px] bg-popover/40 rounded-sm"></div>
              <div className="w-[10%] h-[2px] bg-popover/50 rounded-sm"></div>
              <div className="w-[10%] h-[2px] bg-popover/50 rounded-sm"></div>
              <div className="w-[10%] h-[2px] bg-popover/50 rounded-sm"></div>
              <div className="w-[8%] h-[2px] bg-success/40 rounded-sm"></div>
              <div className="w-[2px] h-[2px] bg-primary/60 rounded-sm"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Mini chart */}
      <div className="w-[30%] border-l border-border/30 pl-[2px] flex flex-col">
        <div className="h-1 bg-popover/40 rounded-sm mb-[2px]"></div>
        <div className="flex-1 relative">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 32 32" preserveAspectRatio="none">
            <polyline
              points="1,24 5,22 9,18 13,14 17,16 21,10 25,8 31,11"
              fill="none"
              stroke="#f97316"
              strokeWidth="0.7"
              vectorEffect="non-scaling-stroke"
            />
            <polygon
              points="1,24 5,22 9,18 13,14 17,16 21,10 25,8 31,11 31,32 1,32"
              fill="#f97316"
              opacity="0.15"
            />
          </svg>
        </div>
        <div className="h-[2px] bg-popover/30 rounded-sm mt-[1px]"></div>
      </div>
    </div>
  );
}

export function EventTradesScenariosPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-[2px]">
      <div className="h-1 bg-popover/50 rounded-sm"></div>
      <div className="h-[3px] bg-muted/30 rounded-sm"></div>

      <div className="flex-1 flex flex-col gap-[1px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-[2px]">
            <div className="w-[20%] h-[2px] bg-popover/50 rounded-sm"></div>
            <div className="w-[12%] h-[2px] bg-primary/30 rounded-sm"></div>
            <div className="w-[8%] h-[2px] flex gap-[1px] justify-center">
              <div className="w-[1px] h-[1px] bg-foreground"></div>
              <div className="w-[1px] h-[1px] bg-foreground"></div>
              <div className="w-[1px] h-[1px] bg-foreground"></div>
            </div>
            <div className="flex-1 h-[2px] bg-popover rounded-sm"></div>
          </div>
        ))}
      </div>

      <div className="h-[4px] bg-card/40 rounded-sm border-l-2 border-primary/60 pl-[1px] flex flex-col gap-[1px] p-[1px]">
        <div className="h-[1px] bg-foreground/40 rounded-sm"></div>
        <div className="h-[1px] bg-foreground/30 rounded-sm w-4/5"></div>
      </div>
    </div>
  );
}

export function MacroBriefingPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col gap-[2px]">
      {/* Author header */}
      <div className="flex items-center gap-[2px]">
        <div className="w-[4px] h-[4px] rounded-full bg-primary/60"></div>
        <div className="h-[2px] w-1/3 bg-popover/60 rounded-sm"></div>
        <div className="h-[1px] w-1/4 bg-muted-foreground/40 rounded-sm"></div>
      </div>

      {/* Title */}
      <div className="h-[2px] bg-popover rounded-sm"></div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-[1px]">
        <div className="h-[1px] bg-foreground/40 rounded-sm"></div>
        <div className="h-[1px] bg-foreground/30 rounded-sm"></div>
        <div className="h-[1px] bg-foreground/20 rounded-sm w-4/5"></div>
      </div>

      {/* Reactions */}
      <div className="flex gap-[1px]">
        <div className="w-[6px] h-[2px] bg-primary/30 rounded-sm"></div>
        <div className="w-[6px] h-[2px] bg-destructive/30 rounded-sm"></div>
        <div className="w-[6px] h-[2px] bg-warning/30 rounded-sm"></div>
      </div>
    </div>
  );
}

export function FXBankForecastsPreview() {
  const candleHeights = [60, 45, 70, 50, 65, 55, 68, 52];
  return (
    <div className="w-full h-full bg-background p-1 flex gap-[2px]">
      {/* Table side */}
      <div className="flex-1 flex flex-col">
        <div className="h-[3px] bg-primary rounded-sm mb-[1px]"></div>
        <div className="h-[3px] bg-blue-900/60 rounded-sm mb-[2px]"></div>
        <div className="flex-1 flex flex-col gap-[1px]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-[1px]">
              <div className="w-3 h-[2px] bg-primary/30 rounded-sm"></div>
              <div className="flex-1 flex gap-[1px]">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="flex-1 h-[2px] bg-popover/60 rounded-sm"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart side */}
      <div className="w-10 border-l border-border/30 pl-[2px] flex flex-col">
        <div className="h-[3px] bg-popover/50 rounded-sm mb-[2px]"></div>
        <div className="flex-1 relative">
          {candleHeights.map((height, idx) => (
            <div
              key={idx}
              className="absolute bottom-0 w-[2px]"
              style={{
                left: `${idx * 12.5}%`,
                height: `${height}%`,
                backgroundColor: idx % 2 === 0 ? '#22c55e' : '#ef4444',
              }}
            ></div>
          ))}
          <div className="absolute w-full h-[1px] bg-primary/40" style={{ top: '35%' }}></div>
          <div className="absolute w-full h-[1px] bg-primary/40" style={{ top: '60%' }}></div>
          <div className="absolute w-full h-[1px] bg-blue-500/80" style={{ top: '45%' }}></div>
        </div>
      </div>
    </div>
  );
}

export function OverviewListPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col">
      {/* Header row */}
      <div className="flex gap-[1px] mb-[1px]">
        <div className="w-2 h-1 bg-muted rounded-sm"></div>
        <div className="w-3 h-1 bg-muted rounded-sm"></div>
        <div className="w-3 h-1 bg-muted rounded-sm"></div>
        <div className="flex-1 h-1 bg-muted rounded-sm"></div>
      </div>
      {/* Data rows */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-[1px] mb-[1px]">
          <div className="w-2 h-1.5 bg-popover rounded-sm"></div>
          <div className="w-3 h-1.5 bg-popover rounded-sm"></div>
          <div className={`w-3 h-1.5 rounded-sm ${
            i % 3 === 0 ? 'bg-success/20' : i % 3 === 1 ? 'bg-destructive/20' : 'bg-warning/20'
          }`}></div>
          <div className="flex-1 h-1.5 bg-popover/50 rounded-sm"></div>
        </div>
      ))}
    </div>
  );
}

export function MarketDataPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col">
      {/* Header row */}
      <div className="flex gap-[1px] mb-[1px]">
        <div className="w-4 h-1 bg-muted rounded-sm"></div>
        <div className="w-3 h-1 bg-muted rounded-sm"></div>
        <div className="w-2 h-1 bg-muted rounded-sm"></div>
        <div className="w-2 h-1 bg-muted rounded-sm"></div>
        <div className="flex-1 h-1 bg-muted rounded-sm"></div>
      </div>
      {/* Category header */}
      <div className="h-[3px] bg-muted-foreground/30 rounded-sm mb-[1px]"></div>
      {/* Data rows with colored badges */}
      {[
        { color: 'bg-red-600' },
        { color: 'bg-blue-600' },
        { color: 'bg-purple-600' },
      ].map((row, i) => (
        <div key={i} className="flex gap-[1px] mb-[1px] items-center">
          <div className={`w-1.5 h-1.5 ${row.color} rounded-[1px]`}></div>
          <div className="w-3 h-1 bg-popover rounded-sm"></div>
          <div className="w-2 h-1 bg-popover rounded-sm"></div>
          <div className={`w-2 h-1 rounded-sm ${
            i % 2 === 0 ? 'bg-success/20' : 'bg-destructive/20'
          }`}></div>
          <div className="flex-1 h-1 bg-popover/50 rounded-sm"></div>
        </div>
      ))}
    </div>
  );
}

export function SupplyDemandAreasPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      {/* Chart area with zones */}
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 50">
          {/* Price line */}
          <polyline
            points="5,40 15,35 25,30 35,25 45,28 55,22 65,18 75,20"
            fill="none"
            stroke="#f97316"
            strokeWidth="1"
          />
          {/* Demand zone (green) */}
          <rect
            x="5"
            y="35"
            width="20"
            height="10"
            fill="#22c55e"
            opacity="0.2"
            stroke="#22c55e"
            strokeWidth="0.5"
          />
          {/* Supply zone (red) */}
          <rect
            x="45"
            y="15"
            width="25"
            height="8"
            fill="#ef4444"
            opacity="0.2"
            stroke="#ef4444"
            strokeWidth="0.5"
          />
          {/* Another demand zone */}
          <rect
            x="60"
            y="18"
            width="15"
            height="6"
            fill="#22c55e"
            opacity="0.2"
            stroke="#22c55e"
            strokeWidth="0.5"
          />
        </svg>
      </div>
      {/* Zone indicators */}
      <div className="flex gap-1 mt-0.5">
        <div className="flex-1 h-0.5 bg-green-500/40 rounded"></div>
        <div className="flex-1 h-0.5 bg-red-500/40 rounded"></div>
        <div className="flex-1 h-0.5 bg-green-500/40 rounded"></div>
      </div>
    </div>
  );
}

export function HighLowPointsPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col">
      {/* Chart area with high/low points */}
      <div className="flex-1 relative">
        <svg className="w-full h-full" viewBox="0 0 80 50">
          {/* Price line */}
          <polyline
            points="5,35 15,30 25,25 35,20 45,18 55,15 65,12 75,10"
            fill="none"
            stroke="#f97316"
            strokeWidth="1"
          />
          {/* High points (red) */}
          <circle cx="15" cy="30" r="2" fill="#ef4444" stroke="#ef4444" strokeWidth="0.5" />
          <circle cx="35" cy="20" r="2" fill="#ef4444" stroke="#ef4444" strokeWidth="0.5" />
          <circle cx="75" cy="10" r="2.5" fill="#ef4444" stroke="#ef4444" strokeWidth="0.5" />
          {/* Low points (green) */}
          <circle cx="25" cy="25" r="2" fill="#22c55e" stroke="#22c55e" strokeWidth="0.5" />
          <circle cx="45" cy="18" r="2" fill="#22c55e" stroke="#22c55e" strokeWidth="0.5" />
          <circle cx="65" cy="12" r="2" fill="#22c55e" stroke="#22c55e" strokeWidth="0.5" />
          {/* Connecting lines to show swing structure */}
          <line x1="15" y1="30" x2="25" y2="25" stroke="#666" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.5" />
          <line x1="25" y1="25" x2="35" y2="20" stroke="#666" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.5" />
          <line x1="35" y1="20" x2="45" y2="18" stroke="#666" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.5" />
          <line x1="45" y1="18" x2="65" y2="12" stroke="#666" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.5" />
          <line x1="65" y1="12" x2="75" y2="10" stroke="#666" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.5" />
        </svg>
      </div>
      {/* Point indicators */}
      <div className="flex gap-1 mt-0.5">
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-full bg-red-500"></div>
          <div className="w-2 h-0.5 bg-popover/30 rounded"></div>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-full bg-green-500"></div>
          <div className="w-2 h-0.5 bg-popover/30 rounded"></div>
        </div>
        <div className="flex-1"></div>
      </div>
    </div>
  );
}

export function GaugeOverviewPreview() {
  return (
    <div className="w-full h-full bg-background p-1 flex flex-col items-center justify-center gap-1">
      {/* Header */}
      <div className="w-full h-1 bg-popover rounded-sm mb-0.5"></div>
      
      {/* Gauge arc */}
      <div className="flex-1 relative flex items-center justify-center">
        <svg width="40" height="24" viewBox="0 0 40 24" className="overflow-visible">
          {/* Background arc */}
          <path
            d="M 5 20 A 16 16 0 0 1 35 20"
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="4"
            strokeLinecap="butt"
          />
          
          {/* Segment 1 - Strong Sell */}
          <path
            d="M 5 20 A 16 16 0 0 0 11.2 12.8"
            fill="none"
            stroke="#dc2626"
            strokeWidth="3.5"
            strokeLinecap="butt"
            opacity="0.6"
          />
          
          {/* Segment 2 - Sell */}
          <path
            d="M 11.2 12.8 A 16 16 0 0 0 17.4 7.6"
            fill="none"
            stroke="#ef4444"
            strokeWidth="3.5"
            strokeLinecap="butt"
            opacity="0.6"
          />
          
          {/* Segment 3 - Neutral */}
          <path
            d="M 17.4 7.6 A 16 16 0 0 0 22.6 7.6"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3.5"
            strokeLinecap="butt"
            opacity="0.6"
          />
          
          {/* Segment 4 - Buy (ACTIVE with glow) */}
          <path
            d="M 22.6 7.6 A 16 16 0 0 0 28.8 12.8"
            fill="none"
            stroke="#10b981"
            strokeWidth="4.5"
            strokeLinecap="butt"
            opacity="1"
            filter="drop-shadow(0 0 2px #10b981)"
          />
          
          {/* Segment 5 - Strong Buy */}
          <path
            d="M 28.8 12.8 A 16 16 0 0 0 35 20"
            fill="none"
            stroke="#059669"
            strokeWidth="3.5"
            strokeLinecap="butt"
            opacity="0.6"
          />
        </svg>
      </div>
      
      {/* Stats row */}
      <div className="w-full flex gap-[1px] justify-center">
        <div className="w-2 h-1 bg-emerald-500/30 rounded-sm"></div>
        <div className="w-2 h-1 bg-red-500/30 rounded-sm"></div>
        <div className="w-2 h-1 bg-amber-500/30 rounded-sm"></div>
      </div>
    </div>
  );
}

// Stock Analysis Preview Components
export function BalanceSheetPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col">
      {/* Header */}
      <div className="h-1 bg-popover rounded-sm mb-[1px]"></div>
      
      {/* Table header row */}
      <div className="flex gap-[1px] mb-[1px]">
        <div className="flex-[2] h-[3px] bg-popover/50 rounded-sm"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-1 h-[3px] bg-popover/50 rounded-sm"></div>
        ))}
      </div>
      
      {/* Table rows */}
      <div className="flex-1 flex flex-col gap-[1px]">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex gap-[1px]">
            <div className="flex-[2] h-1 bg-popover/30 rounded-sm"></div>
            {[...Array(5)].map((_, j) => (
              <div 
                key={j} 
                className={`flex-1 h-1 rounded-sm ${
                  i % 3 === 0 ? 'bg-primary/20' : 'bg-popover'
                }`}
              ></div>
            ))}
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="h-[2px] bg-popover/30 rounded-sm mt-[1px]"></div>
    </div>
  );
}

export function IncomeStatementPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col">
      {/* Header */}
      <div className="h-1 bg-popover rounded-sm mb-[1px]"></div>
      
      {/* Table header row */}
      <div className="flex gap-[1px] mb-[1px]">
        <div className="flex-[2] h-[3px] bg-popover/50 rounded-sm"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-1 h-[3px] bg-popover/50 rounded-sm"></div>
        ))}
      </div>
      
      {/* Table rows with revenue/expense pattern */}
      <div className="flex-1 flex flex-col gap-[1px]">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="flex gap-[1px]">
            <div className="flex-[2] h-1 bg-popover/30 rounded-sm"></div>
            {[...Array(5)].map((_, j) => (
              <div 
                key={j} 
                className={`flex-1 h-1 rounded-sm ${
                  i === 0 || i === 8 ? 'bg-primary/20' : // Revenue & Net Income
                  i === 4 ? 'bg-primary/15' : // Operating Income
                  'bg-popover'
                }`}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CashFlowReportPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col">
      {/* Header */}
      <div className="h-1 bg-popover rounded-sm mb-[1px]"></div>
      
      {/* Table header row */}
      <div className="flex gap-[1px] mb-[1px]">
        <div className="flex-[2] h-[3px] bg-popover/50 rounded-sm"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-1 h-[3px] bg-popover/50 rounded-sm"></div>
        ))}
      </div>
      
      {/* Table rows with cash flow pattern */}
      <div className="flex-1 flex flex-col gap-[1px]">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex gap-[1px]">
            <div className="flex-[2] h-1 bg-popover/30 rounded-sm"></div>
            {[...Array(5)].map((_, j) => (
              <div 
                key={j} 
                className={`flex-1 h-1 rounded-sm ${
                  i === 0 || i === 9 ? 'bg-primary/20' : // Net Income & Free Cash Flow
                  i === 3 || i === 6 ? 'bg-primary/15' : // Operating/Investing/Financing totals
                  'bg-popover'
                }`}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalystRecommendationsPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col gap-[2px]">
      {/* Header */}
      <div className="h-1 bg-popover rounded-sm"></div>
      
      {/* Consensus section with rating distribution bar */}
      <div className="h-2 bg-popover/30 rounded-sm"></div>
      <div className="flex gap-[1px] h-[3px] rounded-full overflow-hidden">
        <div className="flex-[2] bg-green-500"></div>
        <div className="flex-[3] bg-green-400"></div>
        <div className="flex-1 bg-yellow-500"></div>
      </div>
      
      {/* Rating legend */}
      <div className="grid grid-cols-5 gap-[1px] mt-[1px]">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-[3px] bg-popover/30 rounded-sm"></div>
        ))}
      </div>
    </div>
  );
}

export function PriceTargetsPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col gap-[2px]">
      {/* Header */}
      <div className="h-1 bg-popover rounded-sm"></div>
      
      {/* Price targets grid */}
      <div className="grid grid-cols-2 gap-[1px] mt-[1px]">
        <div className="h-[3px] bg-popover/40 rounded-sm"></div>
        <div className="h-[3px] bg-primary/20 rounded-sm"></div>
        <div className="h-[2px] bg-green-500/20 rounded-sm"></div>
        <div className="h-[2px] bg-red-500/20 rounded-sm"></div>
      </div>
      
      {/* Upside indicator */}
      <div className="h-[3px] bg-green-500/10 rounded-sm mt-[1px]"></div>
    </div>
  );
}

export function RecentAnalystActionsPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col">
      {/* Header */}
      <div className="h-1 bg-popover rounded-sm mb-[1px]"></div>
      
      {/* Table header row */}
      <div className="flex gap-[1px] mb-[1px]">
        <div className="w-[15%] h-[2px] bg-popover/50 rounded-sm"></div>
        <div className="flex-1 h-[2px] bg-popover/50 rounded-sm"></div>
        <div className="w-[20%] h-[2px] bg-popover/50 rounded-sm"></div>
        <div className="w-[20%] h-[2px] bg-popover/50 rounded-sm"></div>
        <div className="w-[15%] h-[2px] bg-popover/50 rounded-sm"></div>
        <div className="w-[10%] h-[2px] bg-popover/50 rounded-sm"></div>
      </div>
      
      {/* Recent recommendations table rows */}
      <div className="flex-1 flex flex-col gap-[1px]">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex gap-[1px]">
            <div className="w-[15%] h-1 bg-popover/30 rounded-sm"></div>
            <div className="flex-1 h-1 bg-popover/40 rounded-sm"></div>
            <div className="w-[20%] h-1 bg-popover/30 rounded-sm"></div>
            <div className="w-[20%] h-1 bg-green-500/20 rounded-sm"></div>
            <div className="w-[15%] h-1 bg-primary/15 rounded-sm"></div>
            <div className="w-[10%] h-1 bg-popover/20 rounded-sm"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsiderTransactionsPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex flex-col">
      {/* Header */}
      <div className="h-1 bg-popover rounded-sm mb-[1px]"></div>
      
      {/* Table header row */}
      <div className="flex gap-[1px] mb-[1px]">
        <div className="w-[12%] h-[2px] bg-popover/50 rounded-sm"></div>
        <div className="flex-1 h-[2px] bg-popover/50 rounded-sm"></div>
        <div className="w-[15%] h-[2px] bg-popover/50 rounded-sm"></div>
        <div className="w-[10%] h-[2px] bg-popover/50 rounded-sm"></div>
        <div className="w-[15%] h-[2px] bg-popover/50 rounded-sm"></div>
        <div className="w-[12%] h-[2px] bg-popover/50 rounded-sm"></div>
      </div>
      
      {/* Insider transactions table rows */}
      <div className="flex-1 flex flex-col gap-[1px]">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex gap-[1px]">
            <div className="w-[12%] h-1 bg-popover/30 rounded-sm"></div>
            <div className="flex-1 h-1 bg-popover/40 rounded-sm"></div>
            <div className="w-[15%] h-1 bg-popover/30 rounded-sm"></div>
            <div className={`w-[10%] h-1 rounded-sm ${
              i % 3 === 0 ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}></div>
            <div className="w-[15%] h-1 bg-popover/30 rounded-sm"></div>
            <div className={`w-[12%] h-1 rounded-sm ${
              i % 3 === 0 ? 'bg-green-500/15' : 'bg-red-500/15'
            }`}></div>
          </div>
        ))}
      </div>
      
      {/* Footer summary */}
      <div className="h-[3px] bg-popover/20 rounded-sm mt-[1px]"></div>
    </div>
  );
}

export function InstitutionalShareholdersPreview() {
  return (
    <div className="w-full h-full bg-background p-[2px] flex">
      {/* Left side - Pie chart */}
      <div className="w-[40%] flex flex-col gap-[1px] pr-[2px]">
        {/* Header */}
        <div className="h-1 bg-popover rounded-sm"></div>
        
        {/* Pie chart circle */}
        <div className="flex-1 flex items-center justify-center">
          <svg width="30" height="30" viewBox="0 0 30 30">
            {/* Pie segments */}
            <circle cx="15" cy="15" r="12" fill="#f97316" stroke="#000" strokeWidth="0.5" />
            <path d="M15,15 L15,3 A12,12 0 0,1 24.5,9.5 Z" fill="#fb923c" stroke="#000" strokeWidth="0.5" />
            <path d="M15,15 L24.5,9.5 A12,12 0 0,1 27,15 Z" fill="#fdba74" stroke="#000" strokeWidth="0.5" />
            <path d="M15,15 L27,15 A12,12 0 0,1 24.5,20.5 Z" fill="#fed7aa" stroke="#000" strokeWidth="0.5" />
            {/* Center circle */}
            <circle cx="15" cy="15" r="6" fill="#09090b" stroke="#27272a" strokeWidth="0.5" />
          </svg>
        </div>
        
        {/* Legend */}
        <div className="flex flex-col gap-[1px]">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[2px] bg-popover/30 rounded-sm"></div>
          ))}
        </div>
      </div>
      
      {/* Right side - Table */}
      <div className="flex-1 flex flex-col gap-[1px] pl-[2px]">
        {/* Header */}
        <div className="h-1 bg-popover rounded-sm"></div>
        
        {/* Table rows */}
        <div className="flex-1 flex flex-col gap-[1px]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-[1px]">
              <div className="w-[8%] h-1 bg-primary/20 rounded-sm"></div>
              <div className="flex-1 h-1 bg-popover/30 rounded-sm"></div>
              <div className="w-[20%] h-1 bg-popover/40 rounded-sm"></div>
              <div className="w-[20%] h-1 bg-popover/40 rounded-sm"></div>
              <div className="w-[15%] h-1 bg-primary/15 rounded-sm"></div>
              <div className="w-[15%] h-1 bg-popover/30 rounded-sm"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Tab Menu Widget Preview
export function TabMenuWidgetPreview() {
  return (
    <div className="w-full h-full bg-background p-0.5 flex flex-col">
      {/* Tab bar with tabs and + button */}
      <div className="h-2 bg-widget-header rounded-t-sm flex items-end gap-[1px] px-[1px]">
        {/* Active tab */}
        <div className="h-1.5 px-1.5 bg-background rounded-t-sm border-t border-x border-border/50 flex items-center justify-center">
          <div className="w-2 h-[2px] bg-primary rounded-sm"></div>
        </div>
        {/* Inactive tab */}
        <div className="h-1.5 px-1 bg-muted/50 rounded-t-sm flex items-center justify-center">
          <div className="w-1.5 h-[2px] bg-muted-foreground/40 rounded-sm"></div>
        </div>
        {/* Plus button */}
        <div className="h-1.5 w-1.5 bg-muted/30 rounded-t-sm flex items-center justify-center">
          <div className="w-[3px] h-[3px] text-primary font-bold text-[6px] leading-none">+</div>
        </div>
      </div>
      {/* Content area */}
      <div className="flex-1 bg-background border border-t-0 border-border/30 rounded-b-sm p-[2px]">
        <div className="w-full h-full bg-muted/10 rounded-sm flex items-center justify-center">
          <div className="w-4 h-3 bg-popover/50 rounded-sm"></div>
        </div>
      </div>
    </div>
  );
}

// Widget preview mapping
export const widgetPreviews: Record<string, React.ComponentType> = {
  'tabbed-widget': TabMenuWidgetPreview,
  'cot-positioning': COTPositioningPreview,
  'cot-chart-view': COTChartPreview,
  'cot-table-view': GenericWidgetPreview,
  'currency-strength': CurrencyStrengthPreview,
  'currency-strength-meter': CurrencyStrengthMeterPreview,
  'fx-cross-rates': FXCrossRatesPreview,
  'ticker-tape': TickerTapeHeatmapPreview,
  'heatmap': StockHeatmapPreview,
  'economic-event-calendar': EconomicCalendarPreview,
  'economic-event-countdown': EconomicEventCountdownPreview,
  'economic-data-charts': MacroDataChartsPreview,
  'economic-data-table': MacroDataTablePreview,
  'interest-rate-probability': InterestRateProbabilityPreview,
  'implied-forward-curve': ImpliedForwardCurvePreview,
  'implied-forward-rates': ImpliedForwardRatesPreview,
  'probability-table': ProbabilityTablePreview,
  'research-files': ResearchFilesPreview,
  'smart-bias': SmartBiasPreview,
  'smart-bias-chart': SmartBiasChartPreview,
  'macro-ai': MacroAIPreview,
  'live-squawk': LiveSquawkPreview,
  'week-ahead': WeekAheadPreview,
  'bank-trades': BankTradesPreview,
  'event-trades-scenarios': EventTradesScenariosPreview,
  'macro-briefing': MacroBriefingPreview,
  'fx-bank-forecasts': FXBankForecastsPreview,
  'overview-list': OverviewListPreview,
  'market-data': MarketDataPreview,
  'gauge-overview': GaugeOverviewPreview,
  'realtime-headline-ticker': NewsTickerPreview,
  'news-story': NewsStoryPreview,
  'news-dashboard': NewsDashboardPreview,
  'news-sentiment': NewsSentimentPreview,
  'trending-topics': TrendingTopicsPreview,
  'latest-stories': LatestStoriesPreview,
  'risk-sentiment': RiskSentimentPreview,
  'risk-indicator': RiskIndicatorPreview,
  'seasonality-forecast': SeasonalityPreview,
  'seasonality-forecast-chart': SeasonalityPreview,
  'seasonality-forecast-table': SeasonalityPreview,
  'seasonality-performance-table': SeasonalityPreview,
  'seasonality-performance-chart': SeasonalityPreview,
  'price-chart': PriceChartPreview,
  'technical-charts': TechnicalChartsPreview,
  'information-chart': InformationChartPreview,
  'fx-volatility-levels': FXVolatilityLevelsPreview,
  'fx-options-expiry': FXOptionsExpiryPreview,
  'risk-reversals': RiskReversalsPreview,
  'distribution-chart': DistributionChartPreview,
  'average-daily-range': AverageDailyRangePreview,
  'average-range-histogram': AverageRangeHistogramPreview,
  'range-probability': RangeProbabilityPreview,
  'distribution-stats': DistributionStatsPreview,
  'volatility-statistics': VolatilityStatisticsPreview,
  // Utilities widgets
  'world-clock': WorldClockPreview,
  'ticklist': TicklistPreview,
  'notes': NotesPreview,
  'exchange-market-hours': ExchangeMarketHoursPreview,
  'moodboard': MoodBoardPreview,
  'trading-journal': TradingJournalPreview,
  'scoring-table': ScoringTablePreview,
  'watchlist': WatchlistPreview,
  // Retail Sentiment widgets
  'dmx-positioning': DMXPositioningPreview,
  'dmx-chart': DMXChartPreview,
  'dmx-statistics-table': DMXStatisticsTablePreview,
  'dmx-overview': DMXOverviewPreview,
  'dmx-open-interest': DMXOpenInterestPreview,
  // Market Structure widgets
  'supply-and-demand-areas': SupplyDemandAreasPreview,
  'high-and-low-points': HighLowPointsPreview,
  'session-ranges': SessionRangesPreview,
  'percent-monthly-targets': PercentMonthlyTargetsPreview,
  'exponential-moving-average': ExponentialMovingAveragePreview,
  'supertrend': SupertrendPreview,
  'quarter-movement': QuarterMovementPreview,
  // Stock Analysis widgets
  'balance-sheet': BalanceSheetPreview,
  'income-statement': IncomeStatementPreview,
  'cash-flow-report': CashFlowReportPreview,
  'analyst-recommendations': AnalystRecommendationsPreview,
  'price-targets': PriceTargetsPreview,
  'recent-analyst-actions': RecentAnalystActionsPreview,
  'insider-transactions': InsiderTransactionsPreview,
  'institutional-shareholders': InstitutionalShareholdersPreview,
};

