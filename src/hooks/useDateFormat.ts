"use client";

import { useCallback, useMemo } from 'react';
import { usePreferences } from './usePreferences';
import {
  type DateFormatPreference,
  DEFAULT_DATE_FORMAT,
  formatDate,
  formatDateTime,
  formatDateTime12h,
  formatTime,
  formatRelativeTime,
  formatFeedTimestamp,
  formatChartDate,
  formatDateRange,
  formatMonthYear,
  formatDayMonth,
  formatShortMonthYear,
  parseDate,
  getLibraryFormatString,
} from '@/utils/dateFormat';

/**
 * Custom hook that provides date formatting functions that automatically
 * use the user's date format preference from their profile settings.
 * 
 * This eliminates the need for widgets to manually pass the date format
 * to each formatting function, making the code cleaner and more consistent.
 * 
 * @example
 * ```tsx
 * const { format, formatWithTime, formatRelative } = useDateFormat();
 * 
 * // All use the user's preferred format automatically
 * const dateStr = format(new Date());
 * const dateTimeStr = formatWithTime(new Date());
 * const relativeStr = formatRelative(new Date());
 * ```
 */
export function useDateFormat() {
  const { preferences, isLoading } = usePreferences();
  
  // Get the user's date format preference, with fallback to default
  const dateFormat = (preferences.dateFormat as DateFormatPreference) || DEFAULT_DATE_FORMAT;

  // Memoized formatting functions that use the current preference
  const format = useCallback(
    (input: string | number | Date | null | undefined) => formatDate(input, dateFormat),
    [dateFormat]
  );

  const formatWithTime = useCallback(
    (input: string | number | Date | null | undefined, includeSeconds = false) =>
      formatDateTime(input, dateFormat, includeSeconds),
    [dateFormat]
  );

  const formatWithTime12h = useCallback(
    (input: string | number | Date | null | undefined) => formatDateTime12h(input, dateFormat),
    [dateFormat]
  );

  const formatTimeOnly = useCallback(
    (input: string | number | Date | null | undefined, includeSeconds = false) =>
      formatTime(input, includeSeconds),
    []
  );

  const formatRelative = useCallback(
    (input: string | number | Date | null | undefined) => formatRelativeTime(input, dateFormat),
    [dateFormat]
  );

  const formatAsTimestamp = useCallback(
    (input: string | number | Date | null | undefined) => formatFeedTimestamp(input, dateFormat),
    [dateFormat]
  );

  const formatForChart = useCallback(
    (input: string | number | Date | null | undefined) => formatChartDate(input, dateFormat),
    [dateFormat]
  );

  const formatRange = useCallback(
    (start: string | number | Date | null | undefined, end: string | number | Date | null | undefined) =>
      formatDateRange(start, end, dateFormat),
    [dateFormat]
  );

  const formatMonth = useCallback(
    (input: string | number | Date | null | undefined) => formatMonthYear(input),
    []
  );

  const formatDayMonthOnly = useCallback(
    (input: string | number | Date | null | undefined) => formatDayMonth(input),
    []
  );

  const formatShort = useCallback(
    (input: string | number | Date | null | undefined) => formatShortMonthYear(input, dateFormat),
    [dateFormat]
  );

  const parse = useCallback(
    (input: string | number | Date | null | undefined) => parseDate(input),
    []
  );

  // Get format strings for external libraries (TradingView, date-fns, moment)
  const getFormatStringFor = useCallback(
    (library: 'tradingview' | 'datefns' | 'moment' = 'tradingview') =>
      getLibraryFormatString(dateFormat, library),
    [dateFormat]
  );

  // Return both the current format and the formatting functions
  return useMemo(
    () => ({
      // The current date format preference
      dateFormat,
      
      // Core formatting functions
      format,                    // Format date only: "31/12/2024" or "12/31/2024" or "2024-12-31"
      formatWithTime,            // Format with time: "31/12/2024 14:30" or "31/12/2024 14:30:45"
      formatWithTime12h,         // Format with 12h time: "31/12/2024 2:30 PM"
      formatTimeOnly,            // Format time only: "14:30" or "14:30:45"
      formatRelative,            // Relative time: "Just now", "5m ago", "Yesterday", etc.
      formatAsTimestamp,         // Smart timestamp for feeds: "2m ago", "Today 14:30", etc.
      
      // Specialized formatters
      formatForChart,            // For chart tooltips/crosshairs
      formatRange,               // Date range: "31/12/2024 - 05/01/2025"
      formatMonth,               // Month and year: "December 2024"
      formatDayMonthOnly,        // Day and month: "31 Dec"
      formatShort,               // Short format for compact displays
      
      // Utilities
      parse,                     // Parse various date formats to Date object
      getFormatStringFor,        // Get format string for external libraries
      
      // Loading state
      isLoading,                 // True while preferences are being loaded
    }),
    [
      dateFormat,
      format,
      formatWithTime,
      formatWithTime12h,
      formatTimeOnly,
      formatRelative,
      formatAsTimestamp,
      formatForChart,
      formatRange,
      formatMonth,
      formatDayMonthOnly,
      formatShort,
      parse,
      getFormatStringFor,
      isLoading,
    ]
  );
}

/**
 * Type export for the return value of useDateFormat hook
 */
export type UseDateFormatReturn = ReturnType<typeof useDateFormat>;

/**
 * Re-export the DateFormatPreference type for convenience
 */
export type { DateFormatPreference } from '@/utils/dateFormat';
