"use client";

export interface ProbabilityTableValue {
  ID: number;
  MeetingDate: string;
  ProbabilityValue: string;
}

export interface ProbabilityTableRow {
  ID: number;
  symbol: string;
  Percentage: string;
  Start: number;
  values: ProbabilityTableValue[];
}

export interface ProbabilityTableApiPayload {
  status: string;
  data: ProbabilityTableRow[];
}

export interface ProbabilityTableResponse {
  success: boolean;
  data?: ProbabilityTableApiPayload;
  error?: string;
  symbol?: string;
  timestamp?: number;
}

const DEFAULT_TIMEOUT = 20000;
const DEFAULT_SYMBOL = "FF_DISTR";

export async function fetchProbabilityTable(
  symbol: string = DEFAULT_SYMBOL,
  signal?: AbortSignal
): Promise<ProbabilityTableResponse> {
  const controller = !signal ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT) : undefined;

  try {
    const response = await fetch('/api/central-banks/probability-table', {
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
          ? 'Authentication required to view probability table.'
          : `Failed to fetch data (${response.status})`,
      };
    }

    const result = await response.json();
    return result as ProbabilityTableResponse;
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

