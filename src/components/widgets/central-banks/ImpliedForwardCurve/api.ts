"use client";

export interface ImpliedForwardCurveRow {
  id: number;
  symbol: string;
  run_timestamp: string | null;
  as_of_date: string | null;
  ticker: string | null;
  display_name: string | null;
  tenor_label: string | null;
  tenor_months: number | null;
  start_date: string | null;
  maturity_date: string | null;
  days_to_maturity: number | null;
  cf_last: string | null;
  ask: string | null;
  bid: string | null;
  mid: string | null;
}

export interface ImpliedForwardCurveApiPayload {
  status: string;
  data: ImpliedForwardCurveRow[];
  count: number;
}

export interface ImpliedForwardCurveResponse {
  success: boolean;
  data?: ImpliedForwardCurveApiPayload;
  error?: string;
  symbol?: string;
  timestamp?: number;
}

const DEFAULT_TIMEOUT = 20000;

export async function fetchImpliedForwardCurve(
  symbol: string,
  signal?: AbortSignal
): Promise<ImpliedForwardCurveResponse> {
  const controller = !signal ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT) : undefined;

  try {
    const response = await fetch('/api/central-banks/implied-forward-curve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbol }),
      signal: signal ?? controller?.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error: response.status === 401
          ? 'Authentication required to view implied forward curve.'
          : `Failed to fetch data (${response.status})`,
      };
    }

    const result = await response.json();
    return result as ImpliedForwardCurveResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out. Please try again.',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

