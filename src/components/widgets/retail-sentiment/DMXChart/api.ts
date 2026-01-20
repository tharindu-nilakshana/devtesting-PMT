"use client";

export type DMXChartTimeFrame = "monthly" | "daily" | "4h" | "1h";
export type DMXChartDataType =
  | "positions"
  | "percentage"
  | "open-interest"
  | "open-positions"
  | "position-ratio"
  | "lot";

export interface DMXChartPoint {
  date: string;
  long: number | null;
  short: number | null;
}

export interface DMXChartResponse {
  success: boolean;
  data?: DMXChartPoint[];
  unit?: string;
  supportsDualSeries: boolean;
  error?: string;
  timestamp?: number;
}

interface DMXChartApiPayload {
  status: string;
  ShortData?: string;
  LongData?: string;
  OpenData?: string;
  ChartDate?: string;
  Tooltip?: string;
}

const TIMEFRAME_TO_INTERVAL: Record<DMXChartTimeFrame, string> = {
  monthly: "1m",
  daily: "1d",
  "4h": "4h",
  "1h": "1h",
};

const DATATYPE_TO_API: Record<DMXChartDataType, string> = {
  lot: "Lot",
  positions: "Positions",
  percentage: "Percentage",
  "open-interest": "Open Interest",
  "open-positions": "Open Positions",
  "position-ratio": "Position Ratio",
};

function formatSymbolForApi(symbol: string): string {
  if (!symbol) return "";
  return symbol.replace(/[\/\s]/g, "").toUpperCase();
}

function parseList(input?: string): number[] {
  if (!input || typeof input !== "string") return [];
  return input
    .split(",")
    .map((value) => Number.parseFloat(value.trim()))
    .filter((value) => Number.isFinite(value));
}

function parseDates(input?: string): string[] {
  if (!input || typeof input !== "string") return [];
  return input.split(",").map((date) => date.trim());
}

function transformResponse(data: DMXChartApiPayload): {
  points: DMXChartPoint[];
  supportsDualSeries: boolean;
  unit?: string;
} {
  const shortSeries = parseList(data.ShortData);
  const longSeries = parseList(data.LongData);
  const openSeries = parseList(data.OpenData);
  const dates = parseDates(data.ChartDate);
  const unit = data.Tooltip?.trim();

  if (shortSeries.length && longSeries.length) {
    const length = Math.min(shortSeries.length, longSeries.length, dates.length);
    const points: DMXChartPoint[] = [];

    for (let i = 0; i < length; i += 1) {
      points.push({
        date: dates[i],
        short: shortSeries[i],
        long: longSeries[i],
      });
    }

    return {
      points,
      supportsDualSeries: true,
      unit,
    };
  }

  if (openSeries.length && dates.length) {
    const length = Math.min(openSeries.length, dates.length);
    const points: DMXChartPoint[] = [];

    for (let i = 0; i < length; i += 1) {
      points.push({
        date: dates[i],
        long: openSeries[i],
        short: null,
      });
    }

    return {
      points,
      supportsDualSeries: false,
      unit,
    };
  }

  return {
    points: [],
    supportsDualSeries: false,
    unit,
  };
}

interface FetchDMXChartParams {
  symbol: string;
  dataType: DMXChartDataType;
  timeFrame: DMXChartTimeFrame;
  signal?: AbortSignal;
}

export async function fetchDMXChart({
  symbol,
  dataType,
  timeFrame,
  signal,
}: FetchDMXChartParams): Promise<DMXChartResponse> {
  const controller = !signal ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), 20000)
    : undefined;

  try {
    const formattedSymbol = formatSymbolForApi(symbol);
    const requestBody = {
      symbol: formattedSymbol,
      dataType: DATATYPE_TO_API[dataType],
      interval: TIMEFRAME_TO_INTERVAL[timeFrame] || "1h",
    };

    console.log("[DMX Chart] Request", requestBody);

    const response = await fetch("/api/retail-sentiment/dmx-chart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(requestBody),
      signal: signal ?? controller?.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        supportsDualSeries: true,
        error:
          response.status === 401
            ? "Authentication required to view DMX chart data."
            : `Failed to fetch data (${response.status})`,
      };
    }

    const result: {
      success: boolean;
      data?: DMXChartApiPayload;
      error?: string;
      timestamp?: number;
    } = await response.json();

    console.log("[DMX Chart] Response", result);

    if (!result.success || !result.data) {
      return {
        success: false,
        supportsDualSeries: true,
        error: result.error ?? "Failed to fetch DMX chart data",
      };
    }

    const transformed = transformResponse(result.data);

    if (!transformed.points.length) {
      return {
        success: false,
        supportsDualSeries: transformed.supportsDualSeries,
        error: "No DMX chart data available for the selected parameters.",
      };
    }

    return {
      success: true,
      data: transformed.points,
      unit: transformed.unit,
      supportsDualSeries: transformed.supportsDualSeries,
      timestamp: result.timestamp,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        supportsDualSeries: true,
        error: "Request timed out. Please try again.",
      };
    }

    return {
      success: false,
      supportsDualSeries: true,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}


