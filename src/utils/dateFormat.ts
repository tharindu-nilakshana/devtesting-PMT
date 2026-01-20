/**
 * Centralized Date Formatting Utility
 * 
 * This utility provides consistent date formatting across all widgets based on
 * the user's preferred date format setting from Profile Settings.
 * 
 * Supported formats:
 * - DD/MM/YYYY (European)
 * - MM/DD/YYYY (US)
 * - YYYY-MM-DD (ISO)
 */

export type DateFormatPreference = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

// Default format if none specified
export const DEFAULT_DATE_FORMAT: DateFormatPreference = 'DD/MM/YYYY';

/**
 * Parse various date input formats into a Date object
 */
export function parseDate(input: string | number | Date | null | undefined): Date | null {
  if (!input) return null;
  
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  
  if (typeof input === 'number') {
    // Handle Unix timestamps (seconds or milliseconds)
    const timestamp = input > 9999999999 ? input : input * 1000;
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  
  if (typeof input === 'string') {
    // Try ISO format first
    let date = new Date(input);
    if (!isNaN(date.getTime())) return date;
    
    // Try DD.MM.YYYY format (common in European APIs)
    const dotMatch = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotMatch) {
      const [, day, month, year] = dotMatch;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }
    
    // Try DD/MM/YYYY format
    const slashMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }
    
    // Try MM/DD/YYYY format (US)
    const usMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const [, month, day, year] = usMatch;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }
    
    // Try YYYY-MM-DD format
    const isoMatch = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) return date;
    }
    
    return null;
  }
  
  return null;
}

/**
 * Pad a number with leading zeros
 */
function pad(num: number, size: number = 2): string {
  return num.toString().padStart(size, '0');
}

/**
 * Format a date according to the user's preferred format
 * 
 * @param input - Date, string, or timestamp to format
 * @param format - User's preferred date format
 * @returns Formatted date string or empty string if invalid
 */
export function formatDate(
  input: string | number | Date | null | undefined,
  format: DateFormatPreference = DEFAULT_DATE_FORMAT
): string {
  const date = parseDate(input);
  if (!date) return '';
  
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Format a date with time according to the user's preferred format
 * 
 * @param input - Date, string, or timestamp to format
 * @param format - User's preferred date format
 * @param includeSeconds - Whether to include seconds in time
 * @returns Formatted datetime string or empty string if invalid
 */
export function formatDateTime(
  input: string | number | Date | null | undefined,
  format: DateFormatPreference = DEFAULT_DATE_FORMAT,
  includeSeconds: boolean = false
): string {
  const date = parseDate(input);
  if (!date) return '';
  
  const dateStr = formatDate(date, format);
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  
  const timeStr = includeSeconds 
    ? `${hours}:${minutes}:${seconds}`
    : `${hours}:${minutes}`;
  
  return `${dateStr} ${timeStr}`;
}

/**
 * Format a date with 12-hour time format
 * 
 * @param input - Date, string, or timestamp to format
 * @param format - User's preferred date format
 * @returns Formatted datetime string with AM/PM
 */
export function formatDateTime12h(
  input: string | number | Date | null | undefined,
  format: DateFormatPreference = DEFAULT_DATE_FORMAT
): string {
  const date = parseDate(input);
  if (!date) return '';
  
  const dateStr = formatDate(date, format);
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const minutes = pad(date.getMinutes());
  
  return `${dateStr} ${hours}:${minutes} ${ampm}`;
}

/**
 * Format time only (no date)
 * 
 * @param input - Date, string, or timestamp to format
 * @param includeSeconds - Whether to include seconds
 * @returns Formatted time string
 */
export function formatTime(
  input: string | number | Date | null | undefined,
  includeSeconds: boolean = false
): string {
  const date = parseDate(input);
  if (!date) return '';
  
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  
  return includeSeconds 
    ? `${hours}:${minutes}:${seconds}`
    : `${hours}:${minutes}`;
}

/**
 * Format time in 12-hour format
 * 
 * @param input - Date, string, or timestamp to format
 * @returns Formatted time string with AM/PM
 */
export function formatTime12h(
  input: string | number | Date | null | undefined
): string {
  const date = parseDate(input);
  if (!date) return '';
  
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = pad(date.getMinutes());
  
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Format a relative time string (e.g., "2 hours ago", "Yesterday")
 * 
 * @param input - Date, string, or timestamp to format
 * @param format - User's preferred date format (used for older dates)
 * @returns Relative time string
 */
export function formatRelativeTime(
  input: string | number | Date | null | undefined,
  format: DateFormatPreference = DEFAULT_DATE_FORMAT
): string {
  const date = parseDate(input);
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // Future dates
  if (diffMs < 0) {
    return formatDate(date, format);
  }
  
  // Less than a minute
  if (diffSecs < 60) {
    return 'Just now';
  }
  
  // Less than an hour
  if (diffMins < 60) {
    return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
  }
  
  // Less than 24 hours
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }
  
  // Yesterday
  if (diffDays === 1) {
    return 'Yesterday';
  }
  
  // Less than a week
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  
  // Older than a week - show formatted date
  return formatDate(date, format);
}

/**
 * Format a short date for chart axis labels (compact format)
 * Uses abbreviated month names for better chart readability
 * 
 * @param input - Date, string, or timestamp to format
 * @param format - User's preferred date format
 * @returns Short formatted date string
 */
export function formatChartDate(
  input: string | number | Date | null | undefined,
  format: DateFormatPreference = DEFAULT_DATE_FORMAT
): string {
  const date = parseDate(input);
  if (!date) return '';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const shortYear = year.toString().slice(-2);
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day} ${month} '${shortYear}`;
    case 'MM/DD/YYYY':
      return `${month} ${day} '${shortYear}`;
    case 'YYYY-MM-DD':
      return `${year}-${pad(date.getMonth() + 1)}-${pad(day)}`;
    default:
      return `${day} ${month} '${shortYear}`;
  }
}

/**
 * Format a short date with full month for tooltips
 * 
 * @param input - Date, string, or timestamp to format
 * @param format - User's preferred date format
 * @returns Formatted date string with full month name
 */
export function formatChartTooltipDate(
  input: string | number | Date | null | undefined,
  format: DateFormatPreference = DEFAULT_DATE_FORMAT
): string {
  const date = parseDate(input);
  if (!date) return '';
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day} ${month} ${year}`;
    case 'MM/DD/YYYY':
      return `${month} ${day}, ${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${pad(date.getMonth() + 1)}-${pad(day)}`;
    default:
      return `${day} ${month} ${year}`;
  }
}

/**
 * Format a month and year only
 * 
 * @param input - Date, string, or timestamp to format
 * @param format - User's preferred date format
 * @returns Formatted month/year string
 */
export function formatMonthYear(
  input: string | number | Date | null | undefined,
  format: DateFormatPreference = DEFAULT_DATE_FORMAT
): string {
  const date = parseDate(input);
  if (!date) return '';
  
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${pad(date.getMonth() + 1)}`;
    default:
      return `${month} ${year}`;
  }
}

/**
 * Format a short month and year (for chart axes)
 * 
 * @param input - Date, string, or timestamp to format
 * @param format - User's preferred date format
 * @returns Short formatted month/year string
 */
export function formatShortMonthYear(
  input: string | number | Date | null | undefined,
  format: DateFormatPreference = DEFAULT_DATE_FORMAT
): string {
  const date = parseDate(input);
  if (!date) return '';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const shortYear = year.toString().slice(-2);
  
  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${pad(date.getMonth() + 1)}`;
    default:
      return `${month} '${shortYear}`;
  }
}

/**
 * Format a day and month only (for calendar/event displays)
 * 
 * @param input - Date, string, or timestamp to format
 * @param format - User's preferred date format
 * @returns Formatted day/month string
 */
export function formatDayMonth(
  input: string | number | Date | null | undefined,
  format: DateFormatPreference = DEFAULT_DATE_FORMAT
): string {
  const date = parseDate(input);
  if (!date) return '';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day} ${month}`;
    case 'MM/DD/YYYY':
      return `${month} ${day}`;
    case 'YYYY-MM-DD':
      return `${pad(date.getMonth() + 1)}-${pad(day)}`;
    default:
      return `${day} ${month}`;
  }
}

/**
 * Get the day of week name
 * 
 * @param input - Date, string, or timestamp
 * @param short - Whether to return abbreviated day name
 * @returns Day of week name
 */
export function getDayOfWeek(
  input: string | number | Date | null | undefined,
  short: boolean = false
): string {
  const date = parseDate(input);
  if (!date) return '';
  
  const days = short 
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  return days[date.getDay()];
}

/**
 * Format a date range
 * 
 * @param start - Start date
 * @param end - End date
 * @param format - User's preferred date format
 * @returns Formatted date range string
 */
export function formatDateRange(
  start: string | number | Date | null | undefined,
  end: string | number | Date | null | undefined,
  format: DateFormatPreference = DEFAULT_DATE_FORMAT
): string {
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  
  if (!startDate && !endDate) return '';
  if (!startDate) return formatDate(endDate, format);
  if (!endDate) return formatDate(startDate, format);
  
  // Same day
  if (startDate.toDateString() === endDate.toDateString()) {
    return formatDate(startDate, format);
  }
  
  // Same month and year
  if (startDate.getMonth() === endDate.getMonth() && 
      startDate.getFullYear() === endDate.getFullYear()) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[startDate.getMonth()];
    const year = startDate.getFullYear();
    
    switch (format) {
      case 'DD/MM/YYYY':
        return `${startDate.getDate()}-${endDate.getDate()} ${month} ${year}`;
      case 'MM/DD/YYYY':
        return `${month} ${startDate.getDate()}-${endDate.getDate()}, ${year}`;
      case 'YYYY-MM-DD':
        return `${formatDate(startDate, format)} - ${formatDate(endDate, format)}`;
      default:
        return `${startDate.getDate()}-${endDate.getDate()} ${month} ${year}`;
    }
  }
  
  // Different months
  return `${formatDate(startDate, format)} - ${formatDate(endDate, format)}`;
}

/**
 * Check if a date is today
 */
export function isToday(input: string | number | Date | null | undefined): boolean {
  const date = parseDate(input);
  if (!date) return false;
  
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Check if a date is yesterday
 */
export function isYesterday(input: string | number | Date | null | undefined): boolean {
  const date = parseDate(input);
  if (!date) return false;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

/**
 * Check if a date is within the current week
 */
export function isThisWeek(input: string | number | Date | null | undefined): boolean {
  const date = parseDate(input);
  if (!date) return false;
  
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  
  return date >= startOfWeek && date < endOfWeek;
}

/**
 * Format a timestamp for news/feed items with smart relative formatting
 * Shows "Just now", "X minutes ago", "Today HH:MM", "Yesterday HH:MM", or full date
 * 
 * @param input - Date, string, or timestamp to format
 * @param format - User's preferred date format
 * @returns Smart formatted timestamp
 */
export function formatFeedTimestamp(
  input: string | number | Date | null | undefined,
  format: DateFormatPreference = DEFAULT_DATE_FORMAT
): string {
  const date = parseDate(input);
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  // Less than a minute
  if (diffMins < 1) {
    return 'Just now';
  }
  
  // Less than an hour
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  
  // Less than 24 hours
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24 && isToday(date)) {
    return `Today ${formatTime(date)}`;
  }
  
  // Yesterday
  if (isYesterday(date)) {
    return `Yesterday ${formatTime(date)}`;
  }
  
  // Within a week
  if (diffHours < 168) { // 7 days
    return `${getDayOfWeek(date, true)} ${formatTime(date)}`;
  }
  
  // Older
  return formatDateTime(date, format);
}

/**
 * Convert a date format preference string to be used with external libraries
 * like TradingView or date-fns
 * 
 * @param format - User's preferred date format
 * @param targetLibrary - Target library format ('tradingview' | 'datefns' | 'moment')
 * @returns Format string for the target library
 */
export function getLibraryFormatString(
  format: DateFormatPreference = DEFAULT_DATE_FORMAT,
  targetLibrary: 'tradingview' | 'datefns' | 'moment' = 'tradingview'
): string {
  switch (targetLibrary) {
    case 'tradingview':
      switch (format) {
        case 'DD/MM/YYYY':
          return 'dd/MM/yyyy';
        case 'MM/DD/YYYY':
          return 'MM/dd/yyyy';
        case 'YYYY-MM-DD':
          return 'yyyy-MM-dd';
        default:
          return 'dd/MM/yyyy';
      }
    case 'datefns':
      switch (format) {
        case 'DD/MM/YYYY':
          return 'dd/MM/yyyy';
        case 'MM/DD/YYYY':
          return 'MM/dd/yyyy';
        case 'YYYY-MM-DD':
          return 'yyyy-MM-dd';
        default:
          return 'dd/MM/yyyy';
      }
    case 'moment':
      // Moment uses the same format as our preference strings
      return format;
    default:
      return format;
  }
}
