"use client";

import { useEffect, useState, useRef } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { fetchProbabilityTable, type ProbabilityTableRow } from "./api";

interface ProbabilityTableProps {
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  wgid?: string;
  settings?: Record<string, unknown>;
}

interface TableRow {
  id: number;
  rate: string;
  values: string[];
  highlight?: boolean;
}

const getValueColor = (value: string) => {
  const numericValue = parseFloat(value.replace(",", ".").replace("%", ""));
  if (numericValue >= 50) return "text-cyan-400";
  if (numericValue >= 20) return "text-cyan-300";
  if (numericValue >= 5) return "text-cyan-200";
  if (numericValue > 0) return "text-foreground/70";
  return "text-muted-foreground/50";
};

// Format decimal percentage to European format (e.g., "0.0688" -> "6,88%")
const formatPercentage = (value: string | number): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0,0%";
  const percentage = (num * 100).toFixed(2);
  return `${percentage.replace(".", ",")}%`;
};

// Format date from ISO to DD.MM.YYYY (e.g., "2025-10-29" -> "29.10.2025")
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateString;
  }
};

// Get bank name from symbol
const getBankName = (symbol: string): string => {
  const labels: Record<string, string> = {
    'FF_DISTR': 'Federal Reserve',
    'ECB_OIS_DISTR': 'European Central Bank',
    'BOE_OIS_DISTR': 'Bank of England',
    'BOJ_OIS_DISTR': 'Bank of Japan',
    'BOC_OIS_DISTR': 'Bank of Canada',
    'RBA_OIS_DISTR': 'Reserve Bank of Australia',
    'RBNZ_OIS_DISTR': 'Reserve Bank of New Zealand',
    'SNB_OIS_DISTR': 'Swiss National Bank',
  };
  return labels[symbol] || symbol;
};

// Transform API data to table format
const transformTableData = (apiRows: ProbabilityTableRow[]): { dates: string[]; rows: TableRow[] } => {
  if (!apiRows || apiRows.length === 0) {
    return { dates: [], rows: [] };
  }

  // Remove duplicates based on Percentage (rate) value to prevent duplicate rows
  // This ensures each unique rate appears only once, even if API returns duplicates with different IDs
  const seenRates = new Set<string>();
  const uniqueRows = apiRows.filter((row) => {
    const rateKey = row.Percentage;
    if (seenRates.has(rateKey)) {
      return false; // Skip duplicate
    }
    seenRates.add(rateKey);
    return true;
  });

  // Extract meeting dates from the first row (all rows should have the same dates)
  const firstRow = uniqueRows[0];
  const dates = firstRow.values.map((v) => formatDate(v.MeetingDate));

  // Transform each API row to table row format
  const rows: TableRow[] = uniqueRows.map((apiRow) => {
    // Format the rate (Percentage field) - this is the interest rate level
    const rate = formatPercentage(apiRow.Percentage);
    
    // Get probability values for each meeting date
    const values = apiRow.values.map((v) => formatPercentage(v.ProbabilityValue));

    return {
      id: apiRow.ID,
      rate,
      values,
      highlight: apiRow.Start === 1,
    };
  });

  return { dates, rows };
};

export default function ProbabilityTable({
  onRemove,
  onSettings,
  onFullscreen,
  settings,
}: ProbabilityTableProps) {
  const [meetingDates, setMeetingDates] = useState<string[]>([]);
  const [probabilityRows, setProbabilityRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);

  const symbol = (settings?.symbol as string) || "FF_DISTR";

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      const response = await fetchProbabilityTable(symbol, controller.signal);

      if (!mounted) return;

      if (!response.success || !response.data) {
        setError(response.error ?? "Unable to load probability table data");
        setMeetingDates([]);
        setProbabilityRows([]);
        setLoading(false);
        return;
      }

      const apiRows = response.data.data ?? [];
      if (apiRows.length === 0) {
        setMeetingDates([]);
        setProbabilityRows([]);
        setLoading(false);
        return;
      }

      const transformed = transformTableData(apiRows);
      setMeetingDates(transformed.dates);
      setProbabilityRows(transformed.rows);
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

  // Auto-scroll to highlighted row when data loads
  useEffect(() => {
    if (!loading && probabilityRows.length > 0 && highlightedRowRef.current && scrollContainerRef.current) {
      const highlightedIndex = probabilityRows.findIndex(row => row.highlight);
      if (highlightedIndex >= 0) {
        // Wait for DOM to render
        setTimeout(() => {
          const rowElement = highlightedRowRef.current;
          const scrollContainer = scrollContainerRef.current;
          
          if (rowElement && scrollContainer) {
            const rowTop = rowElement.offsetTop;
            const rowHeight = rowElement.offsetHeight;
            // Get the height of 2 rows above (approximate)
            const twoRowsHeight = rowHeight * 2;
            // Calculate scroll position: row position minus 2 rows height
            const scrollPosition = Math.max(0, rowTop - twoRowsHeight);
            
            scrollContainer.scrollTo({
              top: scrollPosition,
              behavior: 'smooth'
            });
          }
        }, 100);
      }
    }
  }, [loading, probabilityRows]);

  return (
    <div className="flex h-full flex-col rounded border border-border bg-widget-body">
      <WidgetHeader
        title="Probability Table"
        subtitle={getBankName(symbol)}
        onRemove={onRemove}
        onSettings={onSettings}
        onFullscreen={onFullscreen}
        helpContent="Heatmap-style table showing implied policy rate probabilities across future meeting dates. Highlight key levels to understand how the curve shifts over time."
      />

      <div ref={scrollContainerRef} className="flex-1 overflow-auto max-h-full">
        {loading && (
          <div className="flex h-full items-center justify-center text-base text-muted-foreground">
            Fetching probability table data…
          </div>
        )}

        {!loading && error && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="text-4xl">⚠️</div>
            <p className="text-base font-semibold text-foreground">Unable to load probability table</p>
            <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          </div>
        )}

        {!loading && !error && meetingDates.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-base text-muted-foreground">
            <div className="text-4xl">📊</div>
            <p>No probability table data available yet.</p>
          </div>
        )}

        {!loading && !error && meetingDates.length > 0 && (
          <div className="min-w-[820px] p-5">
            <table className="w-full border-collapse text-lg leading-relaxed">
              <thead className="text-base font-semibold uppercase tracking-wide text-foreground">
                <tr className="sticky top-0 z-20 border-b border-border bg-widget-header">
                  <th className="sticky left-0 z-30 bg-widget-header px-5 py-3 text-left uppercase tracking-wide text-muted-foreground">
                    Percentage
                  </th>
                  {meetingDates.map((date) => (
                    <th key={date} className="bg-widget-header px-5 py-3 text-center uppercase tracking-wide text-muted-foreground">
                      {date}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {probabilityRows.map((row, rowIndex) => (
                  <tr
                    key={row.id}
                    ref={row.highlight ? highlightedRowRef : null}
                    className={`border-b border-border/40 transition-colors ${
                      row.highlight ? "bg-amber-500/5" : rowIndex % 2 === 0 ? "bg-widget-header/20" : "bg-widget-body"
                    }`}
                  >
                    <td
                      className={`sticky left-0 z-10 px-4 py-2.5 ${
                        row.highlight ? "bg-amber-500/5 text-lg text-foreground font-semibold" : "bg-widget-body text-muted-foreground"
                      }`}
                    >
                      {row.rate}
                    </td>
                    {row.values.map((value, idx) => (
                      <td key={`${row.id}-${idx}`} className={`px-5 py-2.5 text-center text-base font-semibold ${getValueColor(value)}`}>
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

