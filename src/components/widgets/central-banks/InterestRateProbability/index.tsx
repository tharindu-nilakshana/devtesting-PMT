"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import {
  fetchInterestRateProbabilities,
  type InterestRateProbabilityRow,
} from "./api";

type ScenarioType = "cut" | "cut-large" | "hold" | "hike";

interface CentralBankScenario {
  label: string;
  probability: number;
  type: ScenarioType;
}

import { WidgetSettingsSlideIn } from "@/components/bloomberg-ui/WidgetSettingsSlideIn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InterestRateProbabilityProps {
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  settings?: {
    bankName?: string;
  };
}

const DEFAULT_BANK = "Federal Reserve";

const BANK_METADATA: Record<
  string,
  { flag: string; region: string; timezone: string }
> = {
  "Federal Reserve": {
    flag: "🇺🇸",
    region: "United States",
    timezone: "ET",
  },
  "European Central Bank": {
    flag: "🇪🇺",
    region: "Euro Area",
    timezone: "CET",
  },
  "Bank of England": {
    flag: "🇬🇧",
    region: "United Kingdom",
    timezone: "GMT",
  },
  "Bank of Japan": {
    flag: "🇯🇵",
    region: "Japan",
    timezone: "JST",
  },
  "Bank of Canada": {
    flag: "🇨🇦",
    region: "Canada",
    timezone: "ET",
  },
};

const scenarioColors: Record<
  ScenarioType,
  { bg: string; shadow: string; text: string }
> = {
  cut: {
    bg: "rgba(239, 68, 68, 0.85)",
    shadow: "rgba(239, 68, 68, 0.45)",
    text: "rgb(248, 113, 113)",
  },
  "cut-large": {
    bg: "rgba(220, 38, 38, 0.85)",
    shadow: "rgba(220, 38, 38, 0.45)",
    text: "rgb(248, 113, 113)",
  },
  hold: {
    bg: "rgba(100, 116, 139, 0.85)",
    shadow: "rgba(100, 116, 139, 0.4)",
    text: "rgb(148, 163, 184)",
  },
  hike: {
    bg: "rgba(34, 197, 94, 0.85)",
    shadow: "rgba(34, 197, 94, 0.4)",
    text: "rgb(74, 222, 128)",
  },
};

const parseToNumber = (value?: string | number, divider = 1): number | undefined => {
  if (value === undefined || value === null) return undefined;
  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numericValue)) return undefined;
  return divider !== 0 ? numericValue / divider : numericValue;
};

const toPercent = (value?: string | number): number | undefined => {
  const numericValue = parseToNumber(value);
  if (numericValue === undefined) return undefined;
  return Number((numericValue * 100).toFixed(2));
};

const formatPercent = (value?: number, digits = 2): string =>
  typeof value === "number" ? `${value.toFixed(digits)}%` : "—";

const formatDate = (value?: string): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const describeScenario = (meeting?: InterestRateProbabilityRow): CentralBankScenario[] => {
  if (!meeting) return [];

  const entries: CentralBankScenario[] = [
    {
      label: "Cut 50 bps",
      probability: toPercent(meeting.prob_cut_50bps) ?? 0,
      type: "cut-large",
    },
    {
      label: "Cut 25 bps",
      probability: toPercent(meeting.prob_cut_25bps) ?? 0,
      type: "cut",
    },
    {
      label: "Hold",
      probability: toPercent(meeting.prob_hold) ?? 0,
      type: "hold",
    },
    {
      label: "Hike 25 bps",
      probability: toPercent(meeting.prob_hike_25bps) ?? 0,
      type: "hike",
    },
    {
      label: "Hike 50 bps",
      probability: toPercent(meeting.prob_hike_50bps) ?? 0,
      type: "hike",
    },
  ];

  return entries
    .filter((entry) => entry.probability > 0)
    .sort((a, b) => b.probability - a.probability);
};

interface MeetingSummary {
  nextMove: string;
  probability?: number;
  changeBy?: number;
  currentRate?: number;
  scenarios: CentralBankScenario[];
}

const summarizeMeeting = (meeting?: InterestRateProbabilityRow): MeetingSummary => {
  if (!meeting) {
    return {
      nextMove: "Awaiting data",
      scenarios: [],
    };
  }

  const scenarios = describeScenario(meeting);
  const topScenario = scenarios[0];

  return {
    nextMove: topScenario?.label ?? "No clear consensus",
    probability: topScenario?.probability,
    changeBy: parseToNumber(meeting.implied_change_bps, 100),
    currentRate: parseToNumber(meeting.interpolated_ois_rate),
    scenarios,
  };
};

export default function InterestRateProbability({
  onRemove,
  onSettings,
  onFullscreen,
  settings,
}: InterestRateProbabilityProps) {
  const [localSettings, setLocalSettings] = useState({
    bankName: settings?.bankName ?? DEFAULT_BANK,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    setLocalSettings({
      bankName: settings?.bankName ?? DEFAULT_BANK,
    });
  }, [settings?.bankName]);

  const bankName = (typeof localSettings.bankName === "string" && localSettings.bankName.trim().length > 0
    ? localSettings.bankName
    : DEFAULT_BANK);

  const bankMeta = BANK_METADATA[bankName] ?? {
    flag: "🏦",
    region: bankName,
    timezone: "",
  };

  const [meetings, setMeetings] = useState<InterestRateProbabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      const response = await fetchInterestRateProbabilities(bankName, controller.signal);

      if (!mounted) return;

      if (!response.success || !response.data) {
        setError(response.error ?? "Unable to load data");
        setMeetings([]);
        setLoading(false);
        return;
      }

      const payload = response.data;
      setMeetings(payload.data ?? []);
      setLastUpdated(payload.data?.[0]?.run_timestamp ?? null);
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

  const primaryMeeting = meetings[0];
  const meetingSummary = useMemo(() => summarizeMeeting(primaryMeeting), [primaryMeeting]);
  const scenarioBars = meetingSummary.scenarios ?? [];

  const secondaryMeetings = useMemo(() => meetings.slice(1, 6), [meetings]);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      if (chartContainerRef.current) {
        const height = chartContainerRef.current.clientHeight;
        setChartHeight(height);
      }
    };

    // Initial measurement with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateHeight, 0);
    
    // Use ResizeObserver for more accurate height tracking
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateHeight();
      });

      if (chartContainerRef.current) {
        resizeObserver.observe(chartContainerRef.current);
      }
    }

    // Fallback to window resize
    window.addEventListener('resize', updateHeight);
    
    return () => {
      clearTimeout(timeoutId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', updateHeight);
    };
  }, [scenarioBars]);

  return (
    <div className="flex h-full flex-col rounded border border-border bg-widget-body">
      <WidgetHeader
        title="Interest Rate Probability"
        subtitle={bankName}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        onSettings={() => {
          setLocalSettings((prev) => ({ ...prev }));
          onSettings?.();
          setIsSettingsOpen(true);
        }}
        helpContent="Live probabilities sourced from the FedWatch-style feed. Data updates with each run of the upstream model."
      />

      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-5">
        {loading && (
          <div className="flex flex-1 items-center justify-center text-base text-muted-foreground">
            Fetching latest meeting probabilities…
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="text-5xl">⚠️</div>
            <p className="text-base font-semibold text-foreground">Unable to load interest rate probabilities</p>
            <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          </div>
        )}

        {!loading && !error && !primaryMeeting && (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center text-base text-muted-foreground">
            <div className="text-5xl">🏦</div>
            <p>No probability data available for {bankName} yet.</p>
          </div>
        )}

        {!loading && !error && primaryMeeting && (
          <>
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{bankMeta.region}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {[
                {
                  label: "Next Move",
                  value: meetingSummary.nextMove,
                  color: meetingSummary.nextMove.includes("Cut")
                    ? "text-destructive"
                    : meetingSummary.nextMove.includes("Hike")
                    ? "text-emerald-400"
                    : "text-muted-foreground",
                },
                {
                  label: "Probability",
                  value: formatPercent(meetingSummary.probability),
                  color: "text-primary",
                },
                {
                  label: "Current Rate",
                  value: meetingSummary.currentRate !== undefined
                    ? `${meetingSummary.currentRate.toFixed(2)}%`
                    : "—",
                  color: "text-foreground",
                },
                {
                  label: "Expected Δ",
                  value: meetingSummary.changeBy !== undefined
                    ? `${meetingSummary.changeBy > 0 ? "+" : ""}${meetingSummary.changeBy.toFixed(2)}%`
                    : "—",
                  color: meetingSummary.changeBy !== undefined
                    ? meetingSummary.changeBy < 0
                      ? "text-destructive"
                      : meetingSummary.changeBy > 0
                      ? "text-emerald-400"
                      : "text-muted-foreground"
                    : "text-muted-foreground",
                },
                {
                  label: "Meeting Date",
                  value: formatDate(primaryMeeting.meeting_date),
                  color: "text-foreground",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-border/60 bg-widget-header/60 px-4 py-3"
                >
                  <p className="text-sm uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className={`text-lg font-semibold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-center justify-between text-sm uppercase tracking-wide text-muted-foreground">
                <span>Scenario Distribution</span>
                <span>Derived from FedWatch style probabilities</span>
              </div>
              <div ref={chartContainerRef} className="relative flex flex-1 items-end gap-6 pl-8 pr-4">
                <div className="absolute left-0 top-0 bottom-6 flex w-12 flex-col justify-between text-right text-sm text-muted-foreground">
                  <span>100%</span>
                  <span>75%</span>
                  <span>50%</span>
                  <span>25%</span>
                  <span>0%</span>
                </div>
                <div className="absolute left-8 right-4 top-0 bottom-6 flex flex-col justify-between">
                  {[...Array(5)].map((_, idx) => (
                    <div key={idx} className="h-px w-full bg-border/30" />
                  ))}
                </div>
                <div className="flex w-full items-end gap-6 pl-8 pr-2">
                  {scenarioBars.length === 0 && (
                    <div className="flex-1 text-center text-base text-muted-foreground">
                      No scenario distribution provided
                    </div>
                  )}
                  {scenarioBars.map((scenario) => {
                    const palette = scenarioColors[scenario.type];
                    // Calculate bar height in pixels based on the chart container height
                    // bottom-6 accounts for the label space at the bottom
                    const availableHeight = chartHeight > 0 ? chartHeight - 24 : 0; // 24px for bottom padding/label
                    const barHeight = availableHeight > 0 
                      ? Math.max((scenario.probability / 100) * availableHeight, 20)
                      : 20;
                    return (
                      <div key={scenario.label} className="relative flex-1">
                        <div className="relative w-full" style={{ height: `${barHeight}px` }}>
                          <div
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold whitespace-nowrap"
                            style={{ color: palette.text }}
                          >
                            {scenario.probability.toFixed(1)}%
                          </div>
                          <div
                            className="w-full h-full rounded-t-md"
                            style={{
                              backgroundColor: palette.bg,
                              boxShadow: `0 6px 14px ${palette.shadow}`,
                            }}
                          />
                        </div>
                        <div className="mt-2 text-center text-sm font-medium text-muted-foreground">
                          {scenario.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {secondaryMeetings.length > 0 && (
              <div className="rounded-lg border border-border/70 bg-widget-header/40">
                <div className="border-b border-border/60 px-4 py-3 text-base uppercase tracking-wide text-muted-foreground">
                  Future Meetings
                </div>
                <div className="max-h-48 overflow-y-auto text-base">
                  <div className="grid grid-cols-4 gap-1 px-4 py-2 font-semibold text-muted-foreground">
                    <span>Date</span>
                    <span className="text-center">Days</span>
                    <span className="text-center">Implied Δ</span>
                    <span className="text-right">Base Case</span>
                  </div>
                  {secondaryMeetings.map((meeting) => {
                    const summary = summarizeMeeting(meeting);
                    return (
                      <div
                        key={meeting.ID}
                        className="grid grid-cols-4 gap-1 px-4 py-2 text-base text-foreground"
                      >
                        <span>{formatDate(meeting.meeting_date)}</span>
                        <span className="text-center">{meeting.days_to_meeting}d</span>
                        <span className="text-center">
                          {summary.changeBy !== undefined
                            ? `${summary.changeBy > 0 ? "+" : ""}${summary.changeBy.toFixed(2)}%`
                            : "—"}
                        </span>
                        <span className="text-right text-muted-foreground">
                          {summary.nextMove}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-border bg-widget-header px-4 py-2 flex items-center justify-between text-sm text-muted-foreground">
        <span>Source: getFedInterestRateProbabilities (live backend feed)</span>
        <span>
          {lastUpdated
            ? `Updated ${new Date(lastUpdated).toLocaleString()}`
            : "Awaiting timestamp"}
        </span>
      </div>

    </div>
  );
}

