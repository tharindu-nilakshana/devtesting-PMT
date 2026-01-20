"use client";

export interface InterestRateProbabilityRow {
  ID: number;
  BankName: string;
  run_timestamp: string;
  meeting_date: string;
  days_to_meeting: number;
  interpolated_ois_rate: string;
  inter_meeting_forward_rate: string;
  implied_change_bps: string;
  cumulative_change_bps: string;
  prob_cut_50bps: string;
  prob_cut_25bps: string;
  prob_hold: string;
  prob_hike_25bps: string;
  prob_hike_50bps: string;
}

export interface InterestRateProbabilityApiPayload {
  status: string;
  data: InterestRateProbabilityRow[];
  count: number;
}

export interface InterestRateProbabilityResponse {
  success: boolean;
  data?: InterestRateProbabilityApiPayload;
  error?: string;
  bankName?: string;
  timestamp?: number;
}

const DEFAULT_TIMEOUT = 20000;

export async function fetchInterestRateProbabilities(
  bankName: string,
  signal?: AbortSignal
): Promise<InterestRateProbabilityResponse> {
  const controller = !signal ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)
    : undefined;

  try {
    const response = await fetch('/api/central-banks/interest-rate-probability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bankName }),
      signal: signal ?? controller?.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        error: response.status === 401
          ? 'Authentication required to view interest rate probabilities.'
          : `Failed to fetch data (${response.status})`,
      };
    }

    const result = await response.json();
    return result as InterestRateProbabilityResponse;
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

