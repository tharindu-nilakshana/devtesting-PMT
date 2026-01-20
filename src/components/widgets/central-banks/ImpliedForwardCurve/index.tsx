"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import {
  fetchImpliedForwardCurve,
  type ImpliedForwardCurveRow,
} from "./api";
import { getSymbolShortFormat } from "@/utils/symbolMapping";

const SYMBOL_OPTIONS = [
  "USDOIS",
  "EUROIS",
  "GBPOIS",
  "JPYOIS",
  "CADOIS",
  "AUDOIS",
  "NZDOIS",
  "CHFOIS",
];

interface ImpliedForwardCurveProps {
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  wgid?: string;
  settings?: {
    symbol?: string;
  };
}

interface CurvePoint {
  date: string;
  futuresYield: number;
  spotCurve: number;
}

const DEFAULT_SYMBOL = "USDOIS";

export default function ImpliedForwardCurve({
  onRemove,
  onSettings,
  onFullscreen,
  settings,
}: ImpliedForwardCurveProps) {
  const [visibleLines, setVisibleLines] = useState<Set<string>>(
    new Set(["futuresYield", "spotCurve"])
  );
  const [curveData, setCurveData] = useState<CurvePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const symbol =
    settings?.symbol && SYMBOL_OPTIONS.includes(settings.symbol)
      ? settings.symbol
      : DEFAULT_SYMBOL;
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      const response = await fetchImpliedForwardCurve(symbol, controller.signal);

      if (!mounted) return;

      if (!response.success || !response.data) {
        setError(response.error ?? "Unable to load implied forward curve data");
        setCurveData([]);
        setLoading(false);
        return;
      }

      const transformed = transformCurveData(response.data.data);
      setCurveData(transformed);
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
  }, [symbol]);

  const hasData = curveData.length > 0;

  const chartMargins = useMemo(() => ({ top: 16, right: 24, left: 12, bottom: 8 }), []);


  const toggleLine = (id: string) => {
    setVisibleLines((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) {
          next.delete(id);
        }
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
          <div className="text-sm text-muted-foreground mb-2">
            {payload[0].payload.date}
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-base">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-foreground font-medium">{entry.name}:</span>
              </div>
              <span className="text-foreground font-semibold">{entry.value.toFixed(3)}%</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-full flex-col rounded border border-border bg-widget-body">
      <WidgetHeader
        title="Implied Forward Curve"
        subtitle={`[${getSymbolShortFormat(symbol)}]`}
        onRemove={onRemove}
        onSettings={onSettings}
        onFullscreen={onFullscreen}
        helpContent="Compare futures implied yields against the current spot COBRA curve to visualize how traders are pricing upcoming Federal Reserve meetings."
      />

      {/* Legend */}
      <div className="flex items-center gap-7 border-b border-border/60 bg-widget-header px-6 py-4 text-base">
        <button
          type="button"
          onClick={() => toggleLine("futuresYield")}
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <span
            className="h-1 w-8 rounded-full"
            style={{
              backgroundColor: "rgb(59, 130, 246)",
              opacity: visibleLines.has("futuresYield") ? 1 : 0.3,
            }}
          />
          <span
            className="text-foreground"
            style={{ opacity: visibleLines.has("futuresYield") ? 1 : 0.5 }}
          >
            Futures Implied Yield
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleLine("spotCurve")}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <span
            className="h-0.5 w-6 rounded-full"
            style={{
              backgroundColor: "rgb(34, 197, 94)",
              opacity: visibleLines.has("spotCurve") ? 1 : 0.3,
            }}
          />
          <span
            className="text-foreground"
            style={{ opacity: visibleLines.has("spotCurve") ? 1 : 0.5 }}
          >
            Spot COBRA Curve
          </span>
        </button>
      </div>

      <div className="flex-1 p-5">
        {loading ? (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-border/60 text-sm text-muted-foreground">
            Fetching latest implied forward curve…
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded border border-dashed border-destructive/40 px-6 text-center text-sm text-destructive">
            <div className="text-2xl">⚠️</div>
            <p>{error}</p>
          </div>
        ) : hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData} margin={{ top: 12, right: 20, left: 12, bottom: 12 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.2)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="rgba(148, 163, 184, 0.5)"
                axisLine={{ stroke: "rgba(148, 163, 184, 0.3)", strokeWidth: 1 }}
                tickLine={{ stroke: "rgba(148, 163, 184, 0.25)", strokeWidth: 0.75 }}
                tick={{ fill: "rgba(148, 163, 184, 0.8)", fontWeight: 600 }}
                interval="preserveStartEnd"
                tickMargin={12}
                height={60}
                className="text-base"
                angle={-35}
                textAnchor="end"
              />
              <YAxis
                stroke="rgba(148, 163, 184, 0.5)"
                axisLine={{ stroke: "rgba(148, 163, 184, 0.3)", strokeWidth: 1 }}
                tickLine={{ stroke: "rgba(148, 163, 184, 0.25)", strokeWidth: 1 }}
                tick={{ fill: "rgba(148, 163, 184, 0.85)", fontWeight: 600 }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
                tickMargin={10}
                width={70}
                className="text-base"
              />
              <Tooltip content={<CustomTooltip />} />
              {visibleLines.has("futuresYield") && (
                <Line
                  type="monotone"
                  dataKey="futuresYield"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth={2.5}
                  dot={false}
                  name="Futures Implied Yield"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              )}
              {visibleLines.has("spotCurve") && (
                <Line
                  type="monotone"
                  dataKey="spotCurve"
                  stroke="rgb(34, 197, 94)"
                  strokeWidth={2.5}
                  dot={false}
                  name="Spot COBRA Curve"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded border border-dashed border-border/60 text-sm text-muted-foreground">
            No data returned for {symbol}. Try refreshing or selecting another symbol.
          </div>
        )}
      </div>

      <div className="border-t border-border bg-widget-header px-5 py-2 text-xs text-muted-foreground">
        Source: getImpliedForwardCurve (live backend feed)
      </div>
    </div>
  );
}

function transformCurveData(rows: ImpliedForwardCurveRow[]): CurvePoint[] {
  if (!Array.isArray(rows)) return [];

  // Check if we have rows with ask data (for futures yield)
  const hasAskData = rows.some(r => pickRate(r.ask) !== undefined);

  const parsed = rows
    .map((row) => {
      // Spot COBRA Curve: use cf_last (last traded price) as the spot curve
      // This represents the current market spot rate
      const spot = pickRate(row.cf_last);
      
      // Futures Implied Yield: prefer ask (futures are typically quoted at ask), 
      // then average of bid/ask, then mid, then fallback to cf_last if no ask available
      const futuresFromAsk = pickRate(row.ask);
      const futuresFromBidAsk = averageRates(row.bid, row.ask);
      const futuresFromMid = pickRate(row.mid);
      const futures = futuresFromAsk ?? futuresFromBidAsk ?? futuresFromMid ?? spot;

      // Need at least spot data to create a point
      if (spot === undefined) return null;

      return {
        order: getOrderValue(row),
        date: deriveLabel(row),
        futuresYield: futures,
        spotCurve: spot,
      };
    })
    .filter((point): point is CurvePoint & { order: number } => point !== null)
    .sort((a, b) => a.order - b.order)
    .map(({ order, ...rest }) => rest);

  return parsed;
}

function pickRate(value?: string | null): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function averageRates(bid?: string | null, ask?: string | null): number | undefined {
  const b = pickRate(bid);
  const a = pickRate(ask);
  if (b === undefined || a === undefined) return undefined;
  return (a + b) / 2;
}

function deriveLabel(row: ImpliedForwardCurveRow): string {
  return (
    row.display_name ||
    row.tenor_label ||
    row.ticker ||
    row.as_of_date ||
    `Point ${row.id}`
  );
}

function getOrderValue(row: ImpliedForwardCurveRow): number {
  if (typeof row.tenor_months === "number") return row.tenor_months;
  if (row.maturity_date) return new Date(row.maturity_date).getTime();
  const extracted = extractTenorMonths(row.display_name || row.ticker || "");
  if (extracted !== undefined) return extracted;
  return new Date(row.as_of_date ?? row.run_timestamp ?? Date.now()).getTime();
}

function extractTenorMonths(label: string): number | undefined {
  if (!label) return undefined;
  const match = label.match(/(\d+)\s*(Y|M)/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return undefined;
  return match[2].toLowerCase() === "y" ? value * 12 : value;
}

