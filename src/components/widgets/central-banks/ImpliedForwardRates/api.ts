"use client";

import { InterestRateProbabilityRow, InterestRateProbabilityResponse, fetchInterestRateProbabilities } from "../InterestRateProbability/api";

export interface ForwardRatePoint {
  id: number;
  date: string;
  rate: number;
  displayDate: string;
  displayRate: string;
}

export interface ImpliedForwardRatesResponse {
  success: boolean;
  data?: ForwardRatePoint[];
  error?: string;
  bankName?: string;
  timestamp?: number;
}

const DEFAULT_TIMEOUT = 20000;

/**
 * Transform API response to ForwardRatePoint format
 */
function transformForwardRateData(
  rows: InterestRateProbabilityRow[]
): ForwardRatePoint[] {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      // Parse the forward rate from percentage string to decimal
      // e.g., "3.8502" (3.8502%) -> 0.038502
      const rateValue = parseFloat(row.inter_meeting_forward_rate);
      if (isNaN(rateValue)) return null;

      // Convert percentage to decimal (3.8502% -> 0.038502)
      const rate = rateValue / 100;

      // Parse and format the date
      const dateObj = new Date(row.meeting_date);
      if (isNaN(dateObj.getTime())) return null;

      // Format date as "Dec 10, 2025"
      const displayDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Format rate as percentage string (0.038502 -> "3.850%")
      const displayRate = `${rateValue.toFixed(3)}%`;

      return {
        id: row.ID, // Use the unique ID from the API
        date: row.meeting_date, // ISO date for sorting
        rate,
        displayDate,
        displayRate,
      };
    })
    .filter((point): point is ForwardRatePoint => point !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function fetchImpliedForwardRates(
  bankName: string,
  signal?: AbortSignal
): Promise<ImpliedForwardRatesResponse> {
  try {
    const response = await fetchInterestRateProbabilities(bankName, signal);

    if (!response.success || !response.data?.data) {
      return {
        success: false,
        error: response.error ?? 'Failed to fetch implied forward rates',
      };
    }

    const transformedData = transformForwardRateData(response.data.data);

    return {
      success: true,
      data: transformedData,
      bankName: response.bankName,
      timestamp: response.timestamp,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

