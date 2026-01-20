"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CartesianGrid,
  type DotProps,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import {
  fetchImpliedForwardRates,
  type ForwardRatePoint,
} from "./api";

interface ImpliedForwardRatesProps {
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  wgid?: string;
  settings?: {
    bankName?: string;
  };
}

const DEFAULT_BANK = "Federal Reserve";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ForwardRatePoint;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
        <div className="text-sm text-muted-foreground mb-2 font-medium">
          {data.displayDate}
        </div>
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-foreground font-medium">Rate:</span>
          <span className="text-foreground font-semibold text-base">{data.displayRate}</span>
        </div>
      </div>
    );
  }
  return null;
};

const dotRenderer = (props: DotProps & { payload?: ForwardRatePoint; index?: number }, dataLength: number) => {
  const { cx, cy, payload, index } = props;
  if (!cx || !cy || !payload || index === undefined) {
    return <g key={`empty-dot-${index}`} />;
  }
  
  const point = payload;
  // Increased margin to move labels further right and avoid crossing chart lines
  const labelX = cx + 60;

  return (
    <g key={`dot-${point.id}-${index}`}>
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="rgb(6, 182, 212)"
        stroke="rgb(8, 145, 178)"
        strokeWidth={1.5}
      />
      {index < dataLength - 1 && (
        <g>
          <text
            x={labelX}
            y={cy - 8}
            textAnchor="middle"
            fill="rgba(148, 163, 184, 0.95)"
            className="text-xs font-medium leading-none"
            style={{ fontSize: '11px' }}
          >
            {point.displayDate}
          </text>
          <text
            x={labelX}
            y={cy + 16}
            textAnchor="middle"
            fill="rgba(248, 250, 252, 1)"
            className="text-xs font-semibold leading-none"
            style={{ fontSize: '12px' }}
          >
            {point.displayRate}
          </text>
        </g>
      )}
    </g>
  );
};

export default function ImpliedForwardRates({
  onRemove,
  onSettings,
  onFullscreen,
  settings,
}: ImpliedForwardRatesProps) {
  const [forwardRateData, setForwardRateData] = useState<ForwardRatePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const bankName = settings?.bankName ?? DEFAULT_BANK;

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      const response = await fetchImpliedForwardRates(bankName, controller.signal);

      if (!mounted) return;

      if (!response.success || !response.data) {
        setError(response.error ?? "Unable to load data");
        setForwardRateData([]);
        setLoading(false);
        return;
      }

      setForwardRateData(response.data);
      setLastUpdated(response.timestamp ? new Date(response.timestamp).toLocaleString() : null);
      setLoading(false);
    }

    load().catch((err) => {
      if (!mounted) return;
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [bankName]);

  const { minRate, maxRate } = useMemo(() => {
    if (forwardRateData.length === 0) {
      return { minRate: 0, maxRate: 0.002 };
    }
    
    const rates = forwardRateData.map(d => d.rate);
    const dataMin = Math.min(...rates);
    const dataMax = Math.max(...rates);
    const range = dataMax - dataMin;
    
    // Add minimal padding: 2% of the range on each side
    const padding = range * 0.02;
    const min = dataMin - padding;
    const max = dataMax + padding;
    
    return {
      minRate: min,
      maxRate: max,
    };
  }, [forwardRateData]);

  const CustomDot = (props: DotProps) => dotRenderer(props, forwardRateData.length);

  return (
    <div className="flex h-full flex-col rounded border border-border bg-widget-body">
      <WidgetHeader
        title="Implied Forward Rates"
        subtitle={bankName}
        onRemove={onRemove}
        onSettings={onSettings}
        onFullscreen={onFullscreen}
        helpContent="Step-style visualization of implied policy path across central bank fixed announcement dates, showing the magnitude of expected rate changes."
      />

      {loading && (
        <div className="flex flex-1 items-center justify-center text-base text-muted-foreground">
          Loading implied forward rates...
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="text-5xl">⚠️</div>
          <p className="text-base font-semibold text-foreground">Unable to load implied forward rates</p>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        </div>
      )}

      {!loading && !error && forwardRateData.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center text-base text-muted-foreground">
          <div className="text-5xl">📊</div>
          <p>No implied forward rate data available yet.</p>
        </div>
      )}

      {!loading && !error && forwardRateData.length > 0 && (
        <div className="flex-1 p-5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={forwardRateData}
              margin={{ top: 30, right: 120, left: 60, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.1)"
                vertical={false}
              />
              <XAxis dataKey="date" hide />
              <YAxis
                domain={[minRate, maxRate]}
                stroke="rgba(148, 163, 184, 0.5)"
                axisLine={{ stroke: "rgba(148, 163, 184, 0.3)", strokeWidth: 1 }}
                tickLine={{ stroke: "rgba(148, 163, 184, 0.25)", strokeWidth: 1 }}
                tick={{ fill: "rgba(148, 163, 184, 0.85)", fontWeight: 600 }}
                tickFormatter={(value) => `${(value * 100).toFixed(2)}%`}
                tickMargin={10}
                width={70}
                className="text-base"
              />
              <Tooltip
                cursor={false}
                content={<CustomTooltip />}
              />
              <Line
                type="stepAfter"
                dataKey="rate"
                stroke="rgb(6, 182, 212)"
                strokeWidth={2}
                dot={CustomDot}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "rgb(8,145,178)" }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="border-t border-border bg-widget-header px-5 py-2 text-xs text-muted-foreground">
        {lastUpdated ? `Last Updated: ${lastUpdated} • ` : ''}Source: getFedInterestRateProbabilities (live backend feed)
      </div>
    </div>
  );
}

